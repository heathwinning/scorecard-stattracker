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
  const user = await getUserFromCookies(_request.headers.get("cookie"));
  const lookupId = params.id;

  // Try direct ID first, then fall back to share code lookup
  let scorecard = await queryFirst(
    db,
    `SELECT s.*, t.name as template_name,
       COALESCE(ss.host_only_editing, 0) as host_only_editing,
       COALESCE(ss.is_locked, 0) as is_locked,
       COALESCE(svs.private_player_scores, 0) as private_player_scores
       , COALESCE(sgc.config_json, '{}') as game_config
     FROM scorecards s
     JOIN templates t ON s.template_id = t.id
     LEFT JOIN scorecard_settings ss ON ss.scorecard_id = s.id
     LEFT JOIN scorecard_visibility_settings svs ON svs.scorecard_id = s.id
     LEFT JOIN scorecard_game_configurations sgc ON sgc.scorecard_id = s.id
     WHERE s.id = ?1`,
    [lookupId]
  );

  if (!scorecard && lookupId.length <= 10) {
    scorecard = await queryFirst(
      db,
      `SELECT s.*, t.name as template_name,
         COALESCE(ss.host_only_editing, 0) as host_only_editing,
         COALESCE(ss.is_locked, 0) as is_locked,
         COALESCE(svs.private_player_scores, 0) as private_player_scores
         , COALESCE(sgc.config_json, '{}') as game_config
       FROM scorecards s
       JOIN templates t ON s.template_id = t.id
       LEFT JOIN scorecard_settings ss ON ss.scorecard_id = s.id
       LEFT JOIN scorecard_visibility_settings svs ON svs.scorecard_id = s.id
       LEFT JOIN scorecard_game_configurations sgc ON sgc.scorecard_id = s.id
       WHERE s.share_code = ?1`,
      [lookupId.toUpperCase()]
    );
  }

  if (!scorecard) {
    return NextResponse.json({ error: "Scorecard not found" }, { status: 404 });
  }

  const id = scorecard.id as string;
  const restrictToOwnScores = scorecard.private_player_scores === 1
    && scorecard.sharing_mode === "slots"
    && user?.id !== scorecard.created_by;
  const participant = restrictToOwnScores && user
    ? await queryFirst<{ player_slot_id: string | null }>(
        db,
        "SELECT player_slot_id FROM scorecard_participants WHERE scorecard_id = ?1 AND user_id = ?2",
        [id, user.id]
      )
    : null;
  const playerSlotId = participant?.player_slot_id || null;
  const players = await queryAll(
    db,
    restrictToOwnScores
      ? "SELECT * FROM scorecard_players WHERE scorecard_id = ?1 AND id = ?2 ORDER BY sort_order"
      : "SELECT * FROM scorecard_players WHERE scorecard_id = ?1 ORDER BY sort_order",
    restrictToOwnScores ? [id, playerSlotId] : [id]
  );

  const values = await queryAll(
    db,
    restrictToOwnScores
      ? "SELECT * FROM cell_values WHERE scorecard_id = ?1 AND player_id = ?2"
      : "SELECT * FROM cell_values WHERE scorecard_id = ?1",
    restrictToOwnScores ? [id, playerSlotId] : [id]
  );
  const snapshot = await queryFirst<{ cells_json: string }>(db, "SELECT cells_json FROM scorecard_layout_snapshots WHERE scorecard_id = ?1", [id]);

  return NextResponse.json({ scorecard: { ...scorecard, game_config: JSON.parse((scorecard.game_config as string) || "{}") }, players, values, cells: snapshot ? JSON.parse(snapshot.cells_json) : undefined });
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
  const { title, game_date, notes, sharing_mode, host_only_editing, is_locked, private_player_scores, game_config, players, values } = body;

  // Partial updates are used by the scorecard autosave. Do not clear fields
  // that were not included in the request.
  const current = await queryFirst<{ title: string; game_date: string; notes: string; share_code: string | null; sharing_mode: "shared" | "slots"; host_only_editing: number; is_locked: number; private_player_scores: number }>(
    db,
    `SELECT s.title, s.game_date, s.notes, s.share_code, s.sharing_mode,
       COALESCE(ss.host_only_editing, 0) as host_only_editing,
       COALESCE(ss.is_locked, 0) as is_locked,
       COALESCE(svs.private_player_scores, 0) as private_player_scores
     FROM scorecards s
     LEFT JOIN scorecard_settings ss ON ss.scorecard_id = s.id
     LEFT JOIN scorecard_visibility_settings svs ON svs.scorecard_id = s.id
     WHERE s.id = ?1 AND s.created_by = ?2`,
    [params.id, user.id]
  );
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (current.is_locked && (title !== undefined || game_date !== undefined || notes !== undefined || sharing_mode !== undefined || players !== undefined || values !== undefined)) {
    return NextResponse.json({ error: "This scorecard is locked" }, { status: 423 });
  }

  await execute(
    db,
    `UPDATE scorecards SET title = ?1, game_date = ?2, notes = ?3, sharing_mode = ?4, updated_at = datetime('now') WHERE id = ?5 AND created_by = ?6`,
    [title === undefined ? current.title : String(title).trim(),
      game_date === undefined ? current.game_date : game_date || "",
      notes === undefined ? current.notes : String(notes).trim(),
      sharing_mode === "slots" || sharing_mode === "shared" ? sharing_mode : current.sharing_mode,
      params.id, user.id]
  );

  if (host_only_editing !== undefined || is_locked !== undefined) {
    await execute(
      db,
      `INSERT INTO scorecard_settings (scorecard_id, host_only_editing, is_locked, updated_at)
       VALUES (?1, ?2, ?3, datetime('now'))
       ON CONFLICT(scorecard_id) DO UPDATE SET
         host_only_editing = excluded.host_only_editing,
         is_locked = excluded.is_locked,
         updated_at = excluded.updated_at`,
      [params.id, host_only_editing === undefined ? current.host_only_editing : host_only_editing ? 1 : 0,
        is_locked === undefined ? current.is_locked : is_locked ? 1 : 0]
    );
  }

  if (private_player_scores !== undefined) {
    await execute(
      db,
      `INSERT INTO scorecard_visibility_settings (scorecard_id, private_player_scores, updated_at)
       VALUES (?1, ?2, datetime('now'))
       ON CONFLICT(scorecard_id) DO UPDATE SET
         private_player_scores = excluded.private_player_scores,
         updated_at = excluded.updated_at`,
      [params.id, private_player_scores ? 1 : 0]
    );
  }

  if (game_config !== undefined) {
    await execute(
      db,
      `INSERT INTO scorecard_game_configurations (scorecard_id, config_json, updated_at)
       VALUES (?1, ?2, datetime('now'))
       ON CONFLICT(scorecard_id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at`,
      [params.id, JSON.stringify(game_config)]
    );
  }

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
