import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryFirst, queryAll, execute, uuid } from "@/lib/db";

export const runtime = "edge";

interface TemplateCell {
  id: string;
  template_id: string;
  row_pos: number;
  col_pos: number;
  row_span: number;
  col_span: number;
  cell_type: string;
  cell_key: string;
  label: string;
  formula_expr: string | null;
  per_player: number;
  config_json: string;
  sort_order: number;
}

// GET /api/templates/[id] - get template with cells
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDB();
  const template = await queryFirst(
    db,
    `SELECT t.*, u.name as creator_name, g.name as game_name, g.icon as game_icon
     FROM templates t
     JOIN users u ON t.created_by = u.id
     LEFT JOIN games g ON t.game_id = g.id
     WHERE t.id = ?1`,
    [params.id]
  );

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const cells = await queryAll<TemplateCell>(
    db,
    "SELECT * FROM template_cells WHERE template_id = ?1 AND sort_order >= 0 ORDER BY sort_order",
    [params.id]
  );
  const rules = await queryAll(
    db,
    "SELECT * FROM template_rule_sets WHERE template_id = ?1 ORDER BY sort_order",
    [params.id]
  );

  return NextResponse.json({
    template: {
      ...template,
      cells: cells.map((c) => ({
        ...c,
        config_json: JSON.parse(c.config_json || "{}"),
      })),
      rules: rules.map((rule: Record<string, unknown>) => ({ ...rule, definition_json: JSON.parse(String(rule.definition_json || "{}")) })),
    },
  });
}

// PUT /api/templates/[id] - update template
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
  const existing = await queryFirst(
    db,
    "SELECT * FROM templates WHERE id = ?1 AND created_by = ?2",
    [params.id, user.id]
  );

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, game_id, is_public, cells, rules } = body;

  await execute(
    db,
    `UPDATE templates SET name = ?1, description = ?2, game_id = ?3, is_public = ?4, updated_at = datetime('now') WHERE id = ?5`,
    [name?.trim() || existing.name, (description || "").trim(), game_id || null, is_public ? 1 : 0, params.id]
  );

  if (cells && Array.isArray(cells)) {
    // Retain old rows rather than deleting them: score values reference these
    // IDs and historical layouts use snapshots. Removed rows are hidden from
    // future games, while supplied IDs are updated in place.
    const existingCells = await queryAll<{ id: string }>(db, "SELECT id FROM template_cells WHERE template_id = ?1", [params.id]);
    const existingIds = new Set(existingCells.map((cell) => cell.id));
    await execute(db, "UPDATE template_cells SET sort_order = -1 WHERE template_id = ?1", [params.id]);
    const stmt = db.prepare(
      `INSERT INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
       ON CONFLICT(id) DO UPDATE SET
         row_pos = excluded.row_pos, col_pos = excluded.col_pos, row_span = excluded.row_span, col_span = excluded.col_span,
         cell_type = excluded.cell_type, cell_key = excluded.cell_key, label = excluded.label,
         formula_expr = excluded.formula_expr, per_player = excluded.per_player, config_json = excluded.config_json,
         sort_order = excluded.sort_order`
    );
    const batch = cells.map((cell: Record<string, unknown>, i: number) =>
      stmt.bind(
        typeof cell.id === "string" && existingIds.has(cell.id) ? cell.id : uuid(), params.id,
        (cell.row_pos as number) ?? i, (cell.col_pos as number) ?? 0,
        (cell.row_span as number) ?? 1, (cell.col_span as number) ?? 1,
        (cell.cell_type as string) ?? "input:number", (cell.cell_key as string) ?? `cell_${i}`,
        (cell.label as string) ?? "", (cell.formula_expr as string) ?? null,
        cell.cell_type === "formula" || cell.cell_type === "heading" ? (cell.per_player ? 1 : 0) : 1,
        JSON.stringify(cell.config_json || {}), (cell.sort_order as number) ?? i
      )
    );
    if (batch.length) await db.batch(batch);
  }

  if (rules && Array.isArray(rules)) {
    await execute(db, "DELETE FROM template_rule_sets WHERE template_id = ?1", [params.id]);
    const ruleStmt = db.prepare(
      `INSERT INTO template_rule_sets (id, template_id, rule_key, label, help_text, definition_json, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    );
    await db.batch(rules.map((rule: Record<string, unknown>, index: number) => ruleStmt.bind(
      uuid(), params.id, String(rule.rule_key || `rule_${index}`), String(rule.label || "Optional module"),
      String(rule.help_text || ""), JSON.stringify(rule.definition_json || {}), Number(rule.sort_order ?? index)
    )));
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/templates/[id]
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
    "DELETE FROM templates WHERE id = ?1 AND created_by = ?2",
    [params.id, user.id]
  );

  return NextResponse.json({ success: true });
}
