import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst } from "@/lib/db";

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

  const body = await request.json().catch(() => null);
  const slotId = body?.player_slot_id ?? null;
  if (slotId !== null && (typeof slotId !== "string" || !await queryFirst(db,
    "SELECT id FROM scorecard_players WHERE id = ?1 AND scorecard_id = ?2", [slotId, params.id]))) {
    return NextResponse.json({ error: "Invalid player seat" }, { status: 400 });
  }
  const registerOwner = db.prepare(`INSERT INTO scorecard_participants (id, scorecard_id, user_id, player_slot_id, role)
    VALUES (?1, ?2, ?3, (
      SELECT id FROM scorecard_players WHERE id = ?4 AND scorecard_id = ?2
        AND NOT EXISTS (SELECT 1 FROM scorecard_participants WHERE player_slot_id = ?4 AND user_id <> ?3)
    ), 'owner')
    ON CONFLICT(scorecard_id, user_id) DO UPDATE SET
      role = 'owner', player_slot_id = COALESCE(scorecard_participants.player_slot_id, excluded.player_slot_id)`)
    .bind(crypto.randomUUID(), params.id, user.id, slotId);

  if (scorecard.share_code) {
    await registerOwner.run();
    return NextResponse.json({ share_code: scorecard.share_code });
  }

  // Generate unique code (retry on collision)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShareCode();
    try {
      const [, , result] = await db.batch([
        db.prepare("UPDATE scorecards SET share_code = ?1 WHERE id = ?2 AND share_code IS NULL").bind(code, params.id),
        registerOwner,
        db.prepare("SELECT share_code FROM scorecards WHERE id = ?1").bind(params.id),
      ]);
      return NextResponse.json(result.results[0]);
    } catch {
      // Code collision, try again
      continue;
    }
  }

  return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
}
