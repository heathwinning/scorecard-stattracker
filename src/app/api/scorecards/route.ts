import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryAll, queryFirst, uuid } from "@/lib/db";

export const runtime = "edge";

// GET /api/templates - list templates (public gallery + user's own)
export async function GET(request: NextRequest) {
  const db = getDB();
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);
  const url = new URL(request.url);
  const showPublic = url.searchParams.get("public") !== "false";
  const showMine = url.searchParams.get("mine") === "true";

  let sql = `SELECT t.*, u.name as creator_name, g.name as game_name, g.icon as game_icon
    FROM templates t
    JOIN users u ON t.created_by = u.id
    LEFT JOIN games g ON t.game_id = g.id`;
  const conditions: string[] = [];
  const params: unknown[] = [];

  const gameFilter = url.searchParams.get("game");
  if (gameFilter) {
    params.push(gameFilter);
    conditions.push(`t.game_id = ?${params.length}`);
  }

  if (showPublic) {
    conditions.push("t.is_public = 1");
  }
  if (showMine && user) {
    params.push(user.id);
    conditions.push(`t.created_by = ?${params.length}`);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY t.updated_at DESC LIMIT 50";

  const templates = await queryAll(db, sql, params);
  return NextResponse.json({ templates });
}

// POST /api/templates - create a new template
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const body = await request.json();
  const { name, description, game_id, is_public, cells } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const templateId = uuid();

  await db
    .prepare(
      `INSERT INTO templates (id, name, description, game_id, is_public, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
    .bind(templateId, name.trim(), (description || "").trim(), game_id || null, is_public ? 1 : 0, user.id)
    .run();

  if (cells && Array.isArray(cells)) {
    const stmt = db.prepare(
      `INSERT INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
    );

    // Batch inserts
    const batch = cells.map((cell: Record<string, unknown>, i: number) =>
      stmt.bind(
        uuid(),
        templateId,
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

  return NextResponse.json({ template: { id: templateId, ...body } }, { status: 201 });
}
