import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst, queryAll, execute } from "@/lib/db";

export const runtime = "edge";

type Player = { id: string; player_name: string; sort_order: number };
type Participant = { id: string; player_slot_id: string | null };

// POST /api/scores/join — become a participant and, for slots mode, claim an
// existing host-created player seat.
export async function POST(request: NextRequest) {
  const user = await getUserFromCookies(request.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { share_code, player_slot_id, player_name } = await request.json() as {
    share_code?: string;
    player_slot_id?: string;
    player_name?: string;
  };
  if (!share_code?.trim()) return NextResponse.json({ error: "Share code required" }, { status: 400 });

  const db = getDB();
  const scorecard = await queryFirst<{ id: string; sharing_mode: "shared" | "slots" }>(
    db,
    "SELECT id, sharing_mode FROM scorecards WHERE share_code = ?1",
    [share_code.trim().toUpperCase()]
  );
  if (!scorecard) return NextResponse.json({ error: "Invalid share code" }, { status: 404 });

  const players = async () => queryAll<Player>(
    db,
    "SELECT id, player_name, sort_order FROM scorecard_players WHERE scorecard_id = ?1 ORDER BY sort_order",
    [scorecard.id]
  );
  const response = async (participant: Participant) => {
    const allPlayers = await players();
    const taken = await queryAll<{ player_slot_id: string }>(
      db,
      "SELECT player_slot_id FROM scorecard_participants WHERE scorecard_id = ?1 AND player_slot_id IS NOT NULL",
      [scorecard.id]
    );
    const slot = participant.player_slot_id
      ? allPlayers.find(p => p.id === participant.player_slot_id)
      : undefined;
    return NextResponse.json({
      scorecard_id: scorecard.id,
      sharing_mode: scorecard.sharing_mode,
      player_slot_id: participant.player_slot_id,
      player_name: slot?.player_name || null,
      players: allPlayers,
      taken_slot_ids: taken.map(p => p.player_slot_id),
    });
  };

  let participant = await queryFirst<Participant>(
    db,
    "SELECT id, player_slot_id FROM scorecard_participants WHERE scorecard_id = ?1 AND user_id = ?2",
    [scorecard.id, user.id]
  );
  if (!participant) {
    const id = crypto.randomUUID();
    await execute(
      db,
      "INSERT INTO scorecard_participants (id, scorecard_id, user_id, role) VALUES (?1, ?2, ?3, 'player')",
      [id, scorecard.id, user.id]
    );
    participant = { id, player_slot_id: null };
  }

  // Shared games require no seat: participants can immediately edit every
  // player column, and the host retains the player roster.
  if (scorecard.sharing_mode === "shared") return response(participant);

  // Slots mode: return the available seats until the player explicitly picks
  // one. Never silently create a new seat here.
  if (!player_slot_id) return response(participant);

  const slot = await queryFirst<Player>(
    db,
    "SELECT id, player_name, sort_order FROM scorecard_players WHERE id = ?1 AND scorecard_id = ?2",
    [player_slot_id, scorecard.id]
  );
  if (!slot) return NextResponse.json({ error: "Invalid player seat" }, { status: 400 });

  const claimed = await queryFirst<{ id: string }>(
    db,
    "SELECT id FROM scorecard_participants WHERE scorecard_id = ?1 AND player_slot_id = ?2 AND user_id != ?3",
    [scorecard.id, player_slot_id, user.id]
  );
  if (claimed) return NextResponse.json({ error: "That seat has already been claimed" }, { status: 409 });

  await execute(db, "UPDATE scorecard_participants SET player_slot_id = ?1 WHERE id = ?2", [player_slot_id, participant.id]);
  if (player_name?.trim()) {
    await execute(db, "UPDATE scorecard_players SET player_name = ?1 WHERE id = ?2", [player_name.trim(), player_slot_id]);
  }
  return response({ ...participant, player_slot_id });
}
