import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst, execute } from "@/lib/db";

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
  const body = await request.json();
  const { cells } = body as {
    cells: { template_cell_id: string; player_id: string; value: string; entry_key?: string; is_hidden?: number }[];
  };

  if (!cells || !Array.isArray(cells)) {
    return NextResponse.json({ error: "cells array required" }, { status: 400 });
  }

  // Verify participant and get their assigned slot
  const participant = await queryFirst<{ player_slot_id: string | null; role: string }>(
    db,
    "SELECT player_slot_id, role FROM scorecard_participants WHERE scorecard_id = ?1 AND user_id = ?2",
    [params.id, user.id]
  );

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Owners can edit any cell; players can only edit their own slot's cells
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO cell_values (id, scorecard_id, template_cell_id, player_id, entry_key, value, is_hidden, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))`
  );

  const batch = cells
    .filter((cell) => {
      // Players can only edit cells for their own slot
      if (participant.role !== "owner" && cell.player_id !== participant.player_slot_id) {
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

  if (batch.length > 0) {
    await db.batch(batch);
  }

  return NextResponse.json({ success: true, updated: batch.length });
}
