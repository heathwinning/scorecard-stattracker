import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst, queryAll, execute } from "@/lib/db";

export const runtime = "edge";

// POST /api/scorecards/join — join a shared scorecard via code
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const body = await request.json();
  const { share_code } = body;

  if (!share_code || typeof share_code !== "string") {
    return NextResponse.json({ error: "Share code required" }, { status: 400 });
  }

  // Find scorecard by share code
  const scorecard = await queryFirst<{ id: string; created_by: string; title: string }>(
    db,
    "SELECT id, created_by, title FROM scorecards WHERE share_code = ?1",
    [share_code.trim().toUpperCase()]
  );

  if (!scorecard) {
    return NextResponse.json({ error: "Invalid share code" }, { status: 404 });
  }

  // Check if already a participant
  const existing = await queryFirst<{ id: string; player_slot_id: string | null }>(
    db,
    "SELECT id, player_slot_id FROM scorecard_participants WHERE scorecard_id = ?1 AND user_id = ?2",
    [scorecard.id, user.id]
  );

  if (existing) {
    // Get the player name if they have a slot
    let playerName: string | null = null;
    if (existing.player_slot_id) {
      const slot = await queryFirst<{ player_name: string }>(
        db,
        "SELECT player_name FROM scorecard_players WHERE id = ?1",
        [existing.player_slot_id]
      );
      playerName = slot?.player_name || null;
    }
    return NextResponse.json({
      scorecard_id: scorecard.id,
      player_slot_id: existing.player_slot_id,
      player_name: playerName,
    });
  }

  // Add as participant (no slot assigned yet)
  await execute(
    db,
    `INSERT OR IGNORE INTO scorecard_participants (id, scorecard_id, user_id, role)
     VALUES (?1, ?2, ?3, 'player')`,
    [crypto.randomUUID(), scorecard.id, user.id]
  );

  return NextResponse.json({
    scorecard_id: scorecard.id,
    player_slot_id: null,
    player_name: null,
  });
}
