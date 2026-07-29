import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst, queryAll, execute, uuid } from "@/lib/db";

export const runtime = "edge";

// GET /api/scores/[id] - get scorecard with all values (by id or share code)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDB();
  const lookupId = params.id;

  // Try direct ID first, then fall back to share code lookup
  let scorecard = await queryFirst(
    db,
    `SELECT s.*, t.name as template_name
     FROM scorecards s
     JOIN templates t ON s.template_id = t.id
     WHERE s.id = ?1`,
    [lookupId]
  );

  if (!scorecard && lookupId.length <= 10) {
    scorecard = await queryFirst(
      db,
      `SELECT s.*, t.name as template_name
       FROM scorecards s
       JOIN templates t ON s.template_id = t.id
       WHERE s.share_code = ?1`,
      [lookupId.toUpperCase()]
    );
  }

  if (!scorecard) {
    return NextResponse.json({ error: "Scorecard not found" }, { status: 404 });
  }

  const id = scorecard.id as string;
  const players = await queryAll(
    db,
    "SELECT * FROM scorecard_players WHERE scorecard_id = ?1 ORDER BY sort_order",
    [id]
  );

  const values = await queryAll(
    db,
    "SELECT * FROM cell_values WHERE scorecard_id = ?1",
    [id]
  );

  return NextResponse.json({ scorecard, players, values });
}

// PUT /api/scorecards/[id] - update scorecard (save values)
export async function PUT(
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
  const { title, game_date, notes, players, values } = body;

  await execute(
    db,
    `UPDATE scorecards SET title = ?1, game_date = ?2, notes = ?3, updated_at = datetime('now') WHERE id = ?4 AND created_by = ?5`,
    [(title || "").trim(), game_date || "", (notes || "").trim(), params.id, user.id]
  );

  // Replace players
  if (players && Array.isArray(players)) {
    await execute(db, "DELETE FROM scorecard_players WHERE scorecard_id = ?1", [params.id]);

    const playerStmt = db.prepare(
      "INSERT INTO scorecard_players (id, scorecard_id, player_name, sort_order) VALUES (?1, ?2, ?3, ?4)"
    );
    const playerBatch = players.map((p: Record<string, unknown>, i: number) =>
      playerStmt.bind(uuid(), params.id, (p.player_name as string) || `Player ${i + 1}`, i)
    );
    await db.batch(playerBatch);
  }

  // Upsert cell values
  if (values && Array.isArray(values)) {
    const valStmt = db.prepare(
      `INSERT OR REPLACE INTO cell_values (id, scorecard_id, template_cell_id, player_id, value, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))`
    );
    const valBatch = values.map((v: Record<string, unknown>) =>
      valStmt.bind(
        uuid(),
        params.id,
        v.template_cell_id as string,
        (v.player_id as string) || null,
        String(v.value ?? "")
      )
    );
    await db.batch(valBatch);
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/scorecards/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  await execute(
    db,
    "DELETE FROM scorecards WHERE id = ?1 AND created_by = ?2",
    [params.id, user.id]
  );

  return NextResponse.json({ success: true });
}
