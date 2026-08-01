import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst, queryAll, execute } from "@/lib/db";

export const runtime = "edge";

// PUT /api/scorecards/[id]/cells — update own cells (multiplayer)
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
  const scorecard = await queryFirst<{ sharing_mode: "shared" | "slots" }>(
    db,
    "SELECT sharing_mode FROM scorecards WHERE id = ?1",
    [params.id]
  );
  if (!scorecard) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const { cells, deletes } = body as {
    cells?: { template_cell_id: string; player_id: string; value: string; entry_key?: string; is_hidden?: number }[];
    deletes?: { template_cell_id: string; player_id: string; entry_key?: string }[];
  };

  if ((!cells || !Array.isArray(cells)) && (!deletes || !Array.isArray(deletes))) {
    return NextResponse.json({ error: "cells or deletes array required" }, { status: 400 });
  }
  const cellList = Array.isArray(cells) ? cells : [];
  const deleteList = Array.isArray(deletes) ? deletes : [];

  // Verify participant and get their assigned slot
  let participant = await queryFirst<{ player_slot_id: string | null; role: string }>(
    db,
    "SELECT player_slot_id, role FROM scorecard_participants WHERE scorecard_id = ?1 AND user_id = ?2",
    [params.id, user.id]
  );

  if (!participant) {
    // The scorecard owner may edit per-cell even before joining as a
    // participant. This lets solo scorecards use the same safe per-cell
    // persistence path as live ones.
    const owned = await queryFirst<{ id: string }>(
      db,
      "SELECT id FROM scorecards WHERE id = ?1 AND created_by = ?2",
      [params.id, user.id]
    );
    if (!owned) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }
    participant = { player_slot_id: null, role: "owner" };
  }

  // Resolve stale player IDs from cached clients. A single-player live
  // scorecard has an unambiguous canonical row, so use it instead of creating
  // a second player when an older poll returned a different ID.
  const existingPlayers = await queryAll<{ id: string }>(
    db,
    "SELECT id FROM scorecard_players WHERE scorecard_id = ?1 ORDER BY sort_order",
    [params.id]
  );
  const validPlayerIds = new Set(existingPlayers.map(player => player.id));
  const fallbackPlayerId = participant.role === "owner" && existingPlayers.length === 1
    ? existingPlayers[0].id
    : participant.player_slot_id;
  const normalizedCells = cellList.map(cell => ({
    ...cell,
    player_id: cell.player_id && !validPlayerIds.has(cell.player_id) && fallbackPlayerId
      ? fallbackPlayerId
      : cell.player_id,
  }));

  // Ensure referenced players exist (auto-create if missing)
  const playerIds = [...new Set(normalizedCells.map(c => c.player_id).filter(Boolean))];
  for (const pid of playerIds) {
    const exists = await queryFirst(db,
      "SELECT id FROM scorecard_players WHERE id = ?1 AND scorecard_id = ?2",
      [pid, params.id]
    );
    if (!exists) {
      await execute(db,
        "INSERT OR IGNORE INTO scorecard_players (id, scorecard_id, player_name, sort_order) VALUES (?1, ?2, 'Player', (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM scorecard_players WHERE scorecard_id = ?2))",
        [pid, params.id]
      );
    }
  }

  // Owners can edit any cell; players can only edit their own slot's cells
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO cell_values (id, scorecard_id, template_cell_id, player_id, entry_key, value, is_hidden, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))`
  );

  const batch = normalizedCells
    .filter((cell) => {
      // Players can only edit cells for their own slot
      if (participant.role !== "owner" && scorecard.sharing_mode === "slots" && cell.player_id !== participant.player_slot_id) {
        return false;
      }
      return true;
    })
    .map((cell) =>
      stmt.bind(
        crypto.randomUUID(),
        params.id,
        cell.template_cell_id,
        cell.player_id,
        cell.entry_key ?? '',
        String(cell.value ?? ""),
        cell.is_hidden ?? 0
      )
    );

  // Deletions (multi-entry rows removed by the user)
  const deleteStmt = db.prepare(
    `DELETE FROM cell_values WHERE scorecard_id = ?1 AND template_cell_id = ?2 AND player_id = ?3 AND entry_key = ?4`
  );
  const deleteBatch = deleteList
    .filter((d) => participant.role === "owner" || scorecard.sharing_mode === "shared" || d.player_id === participant.player_slot_id)
    .map((d) => deleteStmt.bind(params.id, d.template_cell_id, d.player_id, d.entry_key ?? ""));

  if (batch.length > 0 || deleteBatch.length > 0) {
    await db.batch([...batch, ...deleteBatch]);
    await execute(db, "UPDATE scorecards SET updated_at = datetime('now') WHERE id = ?1", [params.id]);
  }

  return NextResponse.json({ success: true, updated: batch.length, deleted: deleteBatch.length });
}
