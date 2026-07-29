import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
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
    "SELECT * FROM template_cells WHERE template_id = ?1 ORDER BY sort_order",
    [params.id]
  );

  return NextResponse.json({
    template: {
      ...template,
      cells: cells.map((c) => ({
        ...c,
        config_json: JSON.parse(c.config_json || "{}"),
      })),
    },
  });
}

// PUT /api/templates/[id] - update template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request);
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
  const { name, description, game_id, is_public, cells } = body;

  await execute(
    db,
    `UPDATE templates SET name = ?1, description = ?2, game_id = ?3, is_public = ?4, updated_at = datetime('now') WHERE id = ?5`,
    [name?.trim() || existing.name, (description || "").trim(), game_id || null, is_public ? 1 : 0, params.id]
  );

  if (cells && Array.isArray(cells)) {
    // Delete existing cells and re-insert
    await execute(db, "DELETE FROM template_cells WHERE template_id = ?1", [params.id]);

    const stmt = db.prepare(
      `INSERT INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
    );

    const batch = cells.map((cell: Record<string, unknown>, i: number) =>
      stmt.bind(
        uuid(),
        params.id,
        (cell.row_pos as number) ?? i,
        (cell.col_pos as number) ?? 0,
        (cell.row_span as number) ?? 1,
        (cell.col_span as number) ?? 1,
        (cell.cell_type as string) ?? "input:number",
        (cell.cell_key as string) ?? `cell_${i}`,
        (cell.label as string) ?? "",
        (cell.formula_expr as string) ?? null,
        (cell.per_player as number) ?? 0,
        JSON.stringify(cell.config_json || {}),
        (cell.sort_order as number) ?? i
      )
    );

    await db.batch(batch);
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/templates/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request);
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
