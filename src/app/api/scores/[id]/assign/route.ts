import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst, execute } from "@/lib/db";

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
  const { player_slot_id } = body;

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

  // Check slot isn't already taken by someone else
  const existing = await queryFirst<{ user_id: string }>(
    db,
    "SELECT user_id FROM scorecard_participants WHERE scorecard_id = ?1 AND player_slot_id = ?2 AND user_id != ?3",
    [params.id, player_slot_id, user.id]
  );

  if (existing) {
    return NextResponse.json({ error: "Slot already taken" }, { status: 409 });
  }

  // Verify the slot exists
  const slot = await queryFirst(
    db,
    "SELECT id FROM scorecard_players WHERE id = ?1 AND scorecard_id = ?2",
    [player_slot_id, params.id]
  );

  if (!slot) {
    return NextResponse.json({ error: "Invalid player slot" }, { status: 400 });
  }

  await execute(
    db,
    "UPDATE scorecard_participants SET player_slot_id = ?1 WHERE id = ?2",
    [player_slot_id, participant.id]
  );

  return NextResponse.json({ success: true });
}
