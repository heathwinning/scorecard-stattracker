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
  const accessible = `WITH accessible_ids AS (
    SELECT id FROM scorecards WHERE created_by = ?1
    UNION SELECT scorecard_id FROM scorecard_participants WHERE user_id = ?1
  ), access AS (
    SELECT s.id, member.player_slot_id AS own_slot,
      (s.created_by <> ?1 AND s.sharing_mode = 'slots') AS hide_entries,
      (s.created_by <> ?1 AND s.sharing_mode = 'slots' AND COALESCE(vs.private_player_scores, 0) = 1) AS own_only
    FROM accessible_ids ids JOIN scorecards s ON s.id = ids.id
    LEFT JOIN scorecard_participants member ON member.scorecard_id = s.id AND member.user_id = ?1
    LEFT JOIN scorecard_visibility_settings vs ON vs.scorecard_id = s.id
  )`;
  const [cards, players, values, templates, groups, members] = await db.batch([
    db.prepare(`${accessible}
      SELECT s.id, s.title, s.game_date, s.template_id, t.name AS template_name, l.cells_json,
        (access.own_only OR (access.hide_entries AND EXISTS (
          SELECT 1 FROM cell_values v
          WHERE v.scorecard_id = s.id AND v.is_hidden = 1 AND v.player_id IS NOT access.own_slot
        ))) AS restricted_results
      FROM access JOIN scorecards s ON s.id = access.id JOIN templates t ON t.id = s.template_id
      LEFT JOIN scorecard_layout_snapshots l ON l.scorecard_id = s.id`).bind(user.id),
    db.prepare(`${accessible}
      SELECT p.id, p.scorecard_id, p.player_name, p.sort_order,
        (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(user_id) END FROM scorecard_participants
          WHERE scorecard_id = p.scorecard_id AND player_slot_id = p.id) AS account_id
      FROM access JOIN scorecard_players p ON p.scorecard_id = access.id
      WHERE NOT access.own_only OR p.id = access.own_slot
      ORDER BY p.scorecard_id, p.sort_order, p.id`).bind(user.id),
    db.prepare(`${accessible}
      SELECT v.scorecard_id, v.template_cell_id, v.player_id, v.entry_key, v.value
      FROM access JOIN cell_values v ON v.scorecard_id = access.id
      WHERE (NOT access.own_only OR v.player_id = access.own_slot)
        AND (NOT access.hide_entries OR v.is_hidden = 0 OR v.player_id = access.own_slot)`).bind(user.id),
    db.prepare(`${accessible}
      SELECT c.* FROM template_cells c
      WHERE c.template_id IN (
        SELECT s.template_id FROM access JOIN scorecards s ON s.id = access.id
        LEFT JOIN scorecard_layout_snapshots l ON l.scorecard_id = s.id
        WHERE l.cells_json IS NULL OR l.cells_json = '[]'
      ) ORDER BY c.sort_order`).bind(user.id),
    db.prepare("SELECT id, name FROM player_name_groups WHERE viewer_id = ?1 ORDER BY name COLLATE NOCASE").bind(user.id),
    db.prepare("SELECT group_id, source_key FROM player_name_group_members WHERE viewer_id = ?1").bind(user.id),
  ]);

  type CardRow = Omit<StatisticsHistory["scorecards"][number], "cells"> & { cells_json: string | null };
  type CellRow = Omit<TemplateCell, "config_json"> & { template_id: string; config_json: string | null };
  const templateCells: StatisticsHistory["templateCells"] = Object.create(null);
  for (const row of templates.results as CellRow[]) {
    (templateCells[row.template_id] ??= []).push({ ...row, config_json: JSON.parse(row.config_json || "{}") });
  }
  const nameGroups = (groups.results as { id: string; name: string }[]).map(group => ({ ...group, sources: [] as string[] }));
  const byId = new Map(nameGroups.map(group => [group.id, group]));
  for (const member of members.results as { group_id: string; source_key: string }[]) {
    byId.get(member.group_id)?.sources.push(member.source_key);
  }
  const history: StatisticsHistory = {
    scorecards: (cards.results as CardRow[]).map(({ cells_json, ...card }) => ({
      ...card,
      cells: cells_json ? JSON.parse(cells_json) : undefined,
    })),
    players: players.results as StatisticsHistory["players"],
    values: values.results as StatisticsHistory["values"],
    templateCells,
    nameGroups,
  };

  return NextResponse.json(history, { headers: { "Cache-Control": "private, no-store" } });
}
