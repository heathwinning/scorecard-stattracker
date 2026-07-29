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
  const { share_code, player_name } = body;

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
    let playerName: string | null = null;
    let slotId: string | null = existing.player_slot_id;
    if (slotId) {
      const slot = await queryFirst<{ player_name: string }>(
        db,
        "SELECT player_name FROM scorecard_players WHERE id = ?1",
        [slotId]
      );
      playerName = slot?.player_name || null;
    }
    return NextResponse.json({
      scorecard_id: scorecard.id,
      player_slot_id: slotId,
      player_name: playerName,
    });
  }

  // Add as participant
  const participantId = crypto.randomUUID();
  await execute(
    db,
    `INSERT OR IGNORE INTO scorecard_participants (id, scorecard_id, user_id, role)
     VALUES (?1, ?2, ?3, 'player')`,
    [participantId, scorecard.id, user.id]
  );

  // If player_name provided, create a new player slot
  if (player_name && player_name.trim()) {
    const chosenName = player_name.trim();
    const slotId = crypto.randomUUID();
    const sortOrder = await queryFirst<{ cnt: number }>(
      db,
      "SELECT COUNT(*) as cnt FROM scorecard_players WHERE scorecard_id = ?1",
      [scorecard.id]
    ).then(r => (r?.cnt ?? 0));

    await execute(
      db,
      `INSERT INTO scorecard_players (id, scorecard_id, player_name, sort_order)
       VALUES (?1, ?2, ?3, ?4)`,
      [slotId, scorecard.id, chosenName, sortOrder]
    );

    // Assign the slot to the participant
    await execute(
      db,
      "UPDATE scorecard_participants SET player_slot_id = ?1 WHERE id = ?2",
      [slotId, participantId]
    );

    return NextResponse.json({
      scorecard_id: scorecard.id,
      player_slot_id: slotId,
      player_name: chosenName,
    });
  }

  return NextResponse.json({
    scorecard_id: scorecard.id,
    player_slot_id: null,
    player_name: null,
  });
}
