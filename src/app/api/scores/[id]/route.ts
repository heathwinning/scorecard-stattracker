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
  const { title, game_date, notes, sharing_mode, players, values } = body;

  // Partial updates are used by the scorecard autosave. Do not clear fields
  // that were not included in the request.
  const current = await queryFirst<{ title: string; game_date: string; notes: string; share_code: string | null; sharing_mode: "shared" | "slots" }>(
    db,
    "SELECT title, game_date, notes, share_code, sharing_mode FROM scorecards WHERE id = ?1 AND created_by = ?2",
    [params.id, user.id]
  );
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute(
    db,
    `UPDATE scorecards SET title = ?1, game_date = ?2, notes = ?3, sharing_mode = ?4, updated_at = datetime('now') WHERE id = ?5 AND created_by = ?6`,
    [title === undefined ? current.title : String(title).trim(),
      game_date === undefined ? current.game_date : game_date || "",
      notes === undefined ? current.notes : String(notes).trim(),
      sharing_mode === "slots" || sharing_mode === "shared" ? sharing_mode : current.sharing_mode,
      params.id, user.id]
  );

  // Upsert players (avoid DELETE + CASCADE which wipes cell_values)
  if (players && Array.isArray(players)) {
    const playerStmt = db.prepare(
      `INSERT INTO scorecard_players (id, scorecard_id, player_name, sort_order)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(id) DO UPDATE SET
         player_name = excluded.player_name,
         sort_order = excluded.sort_order`
    );
    const playerBatch = players.map((p: Record<string, unknown>, i: number) =>
      playerStmt.bind((p.id as string) || uuid(), params.id, (p.player_name as string) || `Player ${i + 1}`, i)
    );
    await db.batch(playerBatch);

    // Remove players no longer in the array (doesn't cascade because we upserted first)
    const keepIds = players.map(p => (p.id as string)).filter(Boolean);
    if (keepIds.length > 0) {
      const numberedPlaceholders = keepIds.map((_, i) => `?${i + 2}`).join(",");
      await execute(db, `DELETE FROM scorecard_players WHERE scorecard_id = ?1 AND id NOT IN (${numberedPlaceholders})`, [params.id, ...keepIds]);
    }
  }

  // Upsert cell values
  // Shared/live scorecards persist cells through /cells. Ignore a values
  // payload from an older client so it cannot overwrite live edits or fail
  // because it contains a stale player id from a cached response.
  if (values && Array.isArray(values) && !current.share_code) {
    const valStmt = db.prepare(
      `INSERT OR REPLACE INTO cell_values (id, scorecard_id, template_cell_id, player_id, entry_key, value, is_hidden, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))`
    );
    const valBatch = values.map((v: Record<string, unknown>) =>
      valStmt.bind(
        uuid(),
        params.id,
        v.template_cell_id as string,
        (v.player_id as string) || null,
        (v.entry_key as string) ?? '',
        String(v.value ?? ""),
        (v.is_hidden as number) ?? 0
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
