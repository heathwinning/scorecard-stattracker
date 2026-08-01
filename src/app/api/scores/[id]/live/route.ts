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

  // Verify participant
  const participant = await queryFirst<{ player_slot_id: string | null }>(
    db,
    "SELECT player_slot_id FROM scorecard_participants WHERE scorecard_id = ?1 AND user_id = ?2",
    [scorecardId, user.id]
  );
  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Get scorecard
  const scorecard = await queryFirst(
    db,
    `SELECT s.*, t.name as template_name FROM scorecards s
     JOIN templates t ON s.template_id = t.id WHERE s.id = ?1`,
    [scorecardId]
  );
  if (!scorecard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get players
  const players = await queryAll(
    db,
    "SELECT * FROM scorecard_players WHERE scorecard_id = ?1 ORDER BY sort_order",
    [scorecardId]
  );

  // Get values (only those updated since the last poll)
  let valuesQuery = "SELECT * FROM cell_values WHERE scorecard_id = ?1";
  const queryParams: unknown[] = [scorecardId];
  if (since) {
      // Inclusive comparison is intentional: SQLite timestamps have second
      // precision, so several edits can legitimately share one timestamp.
      valuesQuery += " AND updated_at >= ?2";
    queryParams.push(since);
  }
  const values = await queryAll(db, valuesQuery, queryParams);

  // Get participants
  const participants = await queryAll(
    db,
    `SELECT sp.*, u.name as user_name FROM scorecard_participants sp
     JOIN users u ON sp.user_id = u.id
     WHERE sp.scorecard_id = ?1`,
    [scorecardId]
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
