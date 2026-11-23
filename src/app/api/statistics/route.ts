import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB } from "@/lib/db";
import type { TemplateCell } from "@/lib/api-client";
import type { StatisticsHistory } from "@/lib/statistics";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const user = await getUserFromCookies(request.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDB();
  const [cards, players, values, templates] = await db.batch([
    db.prepare(`SELECT s.id, s.title, s.game_date, s.template_id, t.name AS template_name, l.cells_json
      FROM scorecards s JOIN templates t ON t.id = s.template_id
      LEFT JOIN scorecard_layout_snapshots l ON l.scorecard_id = s.id
      WHERE s.created_by = ?1`).bind(user.id),
    db.prepare(`SELECT p.id, p.scorecard_id, p.player_name, p.sort_order
      FROM scorecard_players p JOIN scorecards s ON s.id = p.scorecard_id
      WHERE s.created_by = ?1 ORDER BY p.scorecard_id, p.sort_order, p.id`).bind(user.id),
    db.prepare(`SELECT v.scorecard_id, v.template_cell_id, v.player_id, v.entry_key, v.value
      FROM cell_values v JOIN scorecards s ON s.id = v.scorecard_id
      WHERE s.created_by = ?1`).bind(user.id),
    db.prepare(`SELECT c.* FROM template_cells c
      WHERE c.template_id IN (
        SELECT s.template_id FROM scorecards s
        LEFT JOIN scorecard_layout_snapshots l ON l.scorecard_id = s.id
        WHERE s.created_by = ?1 AND (l.cells_json IS NULL OR l.cells_json = '[]')
      ) ORDER BY c.sort_order`).bind(user.id),
  ]);

  type CardRow = Omit<StatisticsHistory["scorecards"][number], "cells"> & { cells_json: string | null };
  type CellRow = Omit<TemplateCell, "config_json"> & { template_id: string; config_json: string | null };
  const templateCells: StatisticsHistory["templateCells"] = Object.create(null);
  for (const row of templates.results as CellRow[]) {
    (templateCells[row.template_id] ??= []).push({ ...row, config_json: JSON.parse(row.config_json || "{}") });
  }
  const history: StatisticsHistory = {
    scorecards: (cards.results as CardRow[]).map(({ cells_json, ...card }) => ({
      ...card,
      cells: cells_json ? JSON.parse(cells_json) : undefined,
    })),
    players: players.results as StatisticsHistory["players"],
    values: values.results as StatisticsHistory["values"],
    templateCells,
  };

  return NextResponse.json(history, { headers: { "Cache-Control": "private, no-store" } });
}
