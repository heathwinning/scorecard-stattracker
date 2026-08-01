import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst, queryAll } from "@/lib/db";

export const runtime = "edge";

// GET /api/scorecards/[id]/live — poll for multiplayer updates
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const url = new URL(request.url);
  const since = url.searchParams.get("since") || "";
  const lookupId = params.id;

  // Resolve share code to real ID if needed
  let scorecardId = lookupId;
  if (lookupId.length <= 10 && !lookupId.includes("-")) {
    const resolved = await queryFirst<{ id: string }>(
      db,
      "SELECT id FROM scorecards WHERE share_code = ?1",
      [lookupId.toUpperCase()]
    );
    if (resolved) scorecardId = resolved.id;
  }

  // Get scorecard
  const scorecard = await queryFirst(
    db,
    `SELECT s.*, t.name as template_name,
       COALESCE(ss.host_only_editing, 0) as host_only_editing,
       COALESCE(ss.is_locked, 0) as is_locked,
       COALESCE(svs.private_player_scores, 0) as private_player_scores
     FROM scorecards s
     JOIN templates t ON s.template_id = t.id
     LEFT JOIN scorecard_settings ss ON ss.scorecard_id = s.id
     LEFT JOIN scorecard_visibility_settings svs ON svs.scorecard_id = s.id
     WHERE s.id = ?1`,
    [scorecardId]
  );
  if (!scorecard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify participant after loading the scorecard so privacy restrictions can
  // distinguish the host from a player assigned to a slot.
  const participant = await queryFirst<{ player_slot_id: string | null; role: string }>(
    db,
    "SELECT player_slot_id, role FROM scorecard_participants WHERE scorecard_id = ?1 AND user_id = ?2",
    [scorecardId, user.id]
  );
  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }
  const restrictToOwnScores = scorecard.private_player_scores === 1
    && scorecard.sharing_mode === "slots"
    && participant.role !== "owner"
    && scorecard.created_by !== user.id;

  // Get players
  const players = await queryAll(
    db,
    restrictToOwnScores
      ? "SELECT * FROM scorecard_players WHERE scorecard_id = ?1 AND id = ?2 ORDER BY sort_order"
      : "SELECT * FROM scorecard_players WHERE scorecard_id = ?1 ORDER BY sort_order",
    restrictToOwnScores ? [scorecardId, participant.player_slot_id] : [scorecardId]
  );

  // Get values (only those updated since the last poll)
  let valuesQuery = restrictToOwnScores
    ? "SELECT * FROM cell_values WHERE scorecard_id = ?1 AND player_id = ?2"
    : "SELECT * FROM cell_values WHERE scorecard_id = ?1";
  const queryParams: unknown[] = [scorecardId];
  if (restrictToOwnScores) queryParams.push(participant.player_slot_id);
  if (since) {
      // Inclusive comparison is intentional: SQLite timestamps have second
      // precision, so several edits can legitimately share one timestamp.
      valuesQuery += ` AND updated_at >= ?${queryParams.length + 1}`;
    queryParams.push(since);
  }
  const values = await queryAll(db, valuesQuery, queryParams);

  // Get participants
  const participants = await queryAll(
    db,
    restrictToOwnScores
      ? `SELECT sp.*, u.name as user_name FROM scorecard_participants sp
         JOIN users u ON sp.user_id = u.id
         WHERE sp.scorecard_id = ?1 AND sp.user_id = ?2`
      : `SELECT sp.*, u.name as user_name FROM scorecard_participants sp
         JOIN users u ON sp.user_id = u.id
         WHERE sp.scorecard_id = ?1`,
    restrictToOwnScores ? [scorecardId, user.id] : [scorecardId]
  );

  const latest = await queryFirst<{ last_updated: string | null }>(
    db,
    `SELECT MAX(last_updated) as last_updated FROM (
       SELECT updated_at as last_updated FROM scorecards WHERE id = ?1
       UNION ALL SELECT updated_at as last_updated FROM cell_values WHERE scorecard_id = ?1
       UNION ALL SELECT joined_at as last_updated FROM scorecard_participants WHERE scorecard_id = ?1
     )`,
    [scorecardId]
  );

  return NextResponse.json(
    {
      scorecard,
      players,
      values,
      participants,
      last_updated: latest?.last_updated || scorecard.updated_at,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
