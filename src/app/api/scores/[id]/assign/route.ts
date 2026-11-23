import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst } from "@/lib/db";
import { claimPlayerSlot } from "@/lib/scorecard-participation";

export const runtime = "edge";

// POST /api/scorecards/[id]/assign — claim a player slot
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
  const body = await request.json();
  const { player_slot_id, player_name } = body;

  if (!player_slot_id) {
    return NextResponse.json({ error: "player_slot_id required" }, { status: 400 });
  }

  // Verify participant
  const participant = await queryFirst<{ id: string; role: string }>(
    db,
    "SELECT id, role FROM scorecard_participants WHERE scorecard_id = ?1 AND user_id = ?2",
    [params.id, user.id]
  );

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const name = typeof player_name === "string" ? player_name.trim() : undefined;
  const result = await claimPlayerSlot(db, params.id, user.id, player_slot_id, name);
  if (result === "missing") return NextResponse.json({ error: "Invalid player slot" }, { status: 400 });
  if (result === "taken") return NextResponse.json({ error: "Slot already taken" }, { status: 409 });
  return NextResponse.json({ success: true, player_name: name });
}
