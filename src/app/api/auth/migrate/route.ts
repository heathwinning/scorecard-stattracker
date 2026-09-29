import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { execute, getDB, queryFirst, uuid } from "@/lib/db";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const user = await getUserFromCookies(request.headers.get("cookie"));
  if (!user || user.email.startsWith("guest-")) {
    return NextResponse.json({ error: "Sign in to migrate guest data" }, { status: 401 });
  }

  const body = await request.json();
  const templates = Array.isArray(body.templates) ? body.templates : [];
  const scorecards = Array.isArray(body.scorecards) ? body.scorecards : [];
  const scores = body.scores && typeof body.scores === "object" ? body.scores : {};
  const db = getDB();

  for (const template of templates) {
    if (typeof template.id !== "string" || !template.id.startsWith("guest-") || !Array.isArray(template.cells)) continue;
    await execute(db,
      `INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, 0, ?5, COALESCE(?6, datetime('now')), COALESCE(?7, datetime('now')))` ,
      [template.id, String(template.name || "Untitled scorecard"), String(template.description || ""), template.game_id || null, user.id, template.created_at || null, template.updated_at || null]
    );
    for (const [index, cell] of template.cells.entries()) {
      if (typeof cell.id !== "string" || typeof cell.cell_key !== "string") continue;
      await execute(db,
        `INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
        [cell.id, template.id, Number(cell.row_pos ?? index), Number(cell.col_pos ?? 0), Number(cell.row_span ?? 1), Number(cell.col_span ?? 1), String(cell.cell_type || "input:number"), cell.cell_key, String(cell.label || ""), cell.formula_expr || null, cell.per_player ? 1 : 0, JSON.stringify(cell.config_json || {}), Number(cell.sort_order ?? index)]
      );
    }
    for (const [index, rule] of (Array.isArray(template.rules) ? template.rules : []).entries()) {
      if (typeof rule.rule_key !== "string") continue;
      await execute(db,
        `INSERT OR IGNORE INTO template_rule_sets (id, template_id, rule_key, label, help_text, definition_json, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        [rule.id || uuid(), template.id, rule.rule_key, String(rule.label || "Module"), String(rule.help_text || ""), JSON.stringify(rule.definition_json || {}), Number(rule.sort_order ?? index)]
      );
    }
  }

  for (const scorecard of scorecards) {
    if (typeof scorecard.id !== "string" || !scorecard.id.startsWith("guest-")) continue;
    const templateId = String(scorecard.template_id || "");
    const scoreData = scores[scorecard.id] || {};
    const shareCode = typeof scorecard.share_code === "string" && scorecard.share_code
      ? scorecard.share_code.toUpperCase()
      : null;
    const codeOwner = shareCode
      ? await queryFirst<{ id: string }>(db, "SELECT id FROM scorecards WHERE share_code = ?1", [shareCode])
      : null;
    await execute(db,
      `INSERT OR IGNORE INTO scorecards (id, template_id, created_by, title, game_date, notes, share_code, sharing_mode, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, COALESCE(?9, datetime('now')), COALESCE(?10, datetime('now')))` ,
      [scorecard.id, templateId, user.id, String(scorecard.title || ""), String(scorecard.game_date || new Date().toISOString()), String(scorecard.notes || ""), codeOwner ? null : shareCode, scorecard.sharing_mode === "slots" ? "slots" : "shared", scorecard.created_at || null, scorecard.updated_at || null]
    );
    for (const [index, player] of (Array.isArray(scoreData.players) ? scoreData.players : []).entries()) {
      if (typeof player.id !== "string") continue;
      await execute(db, "INSERT OR IGNORE INTO scorecard_players (id, scorecard_id, player_name, sort_order) VALUES (?1, ?2, ?3, ?4)", [player.id, scorecard.id, String(player.player_name || `Player ${index + 1}`), index]);
    }
    await execute(db,
      `INSERT OR IGNORE INTO scorecard_layout_snapshots (scorecard_id, cells_json, rules_json) VALUES (?1, ?2, ?3)`,
      [scorecard.id, JSON.stringify(Array.isArray(scoreData.cells) ? scoreData.cells : []), JSON.stringify(Array.isArray(scoreData.rule_keys) ? scoreData.rule_keys : [])]
    );
    for (const [index, value] of (Array.isArray(scoreData.values) ? scoreData.values : []).entries()) {
      if (typeof value.template_cell_id !== "string") continue;
      await execute(db,
        `INSERT OR IGNORE INTO cell_values (id, scorecard_id, template_cell_id, player_id, entry_key, value, is_hidden)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        [value.id || `${scorecard.id}-value-${index}`, scorecard.id, value.template_cell_id, value.player_id || null, String(value.entry_key || ""), String(value.value || ""), value.is_hidden ? 1 : 0]
      );
    }
    if (scorecard.host_only_editing || scorecard.is_locked) {
      await execute(db, "INSERT OR IGNORE INTO scorecard_settings (scorecard_id, host_only_editing, is_locked) VALUES (?1, ?2, ?3)", [scorecard.id, scorecard.host_only_editing ? 1 : 0, scorecard.is_locked ? 1 : 0]);
    }
    if (scorecard.private_player_scores) {
      await execute(db, "INSERT OR IGNORE INTO scorecard_visibility_settings (scorecard_id, private_player_scores) VALUES (?1, ?2)", [scorecard.id, 1]);
    }
    if (scorecard.game_config) {
      await execute(db, "INSERT OR IGNORE INTO scorecard_game_configurations (scorecard_id, config_json) VALUES (?1, ?2)", [scorecard.id, JSON.stringify(scorecard.game_config)]);
    }
  }

  return NextResponse.json({ success: true, templates: templates.length, scorecards: scorecards.length });
}
