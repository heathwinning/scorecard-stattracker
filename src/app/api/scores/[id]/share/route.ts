import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst, execute } from "@/lib/db";

export const runtime = "edge";

function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing 0/O, 1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/scorecards/[id]/share — generate or return share code
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();

  // Only the creator can share
  const scorecard = await queryFirst<{ id: string; share_code: string | null; created_by: string }>(
    db,
    "SELECT id, share_code, created_by FROM scorecards WHERE id = ?1",
    [params.id]
  );

  if (!scorecard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (scorecard.created_by !== user.id) {
    return NextResponse.json({ error: "Only the creator can share" }, { status: 403 });
  }

  // Return existing code or generate new one
  if (scorecard.share_code) {
    return NextResponse.json({ share_code: scorecard.share_code });
  }

  // Generate unique code (retry on collision)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShareCode();
    try {
      await execute(
        db,
        "UPDATE scorecards SET share_code = ?1 WHERE id = ?2",
        [code, params.id]
      );
      // Auto-add creator as owner participant
      await execute(
        db,
        `INSERT OR IGNORE INTO scorecard_participants (id, scorecard_id, user_id, role)
         VALUES (?1, ?2, ?3, 'owner')`,
        [crypto.randomUUID(), params.id, user.id]
      );
      return NextResponse.json({ share_code: code });
    } catch {
      // Code collision, try again
      continue;
    }
  }

  return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
}
