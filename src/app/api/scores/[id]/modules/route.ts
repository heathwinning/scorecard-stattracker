import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryAll, queryFirst, execute } from "@/lib/db";
import { resolveLayout } from "@/lib/layout-rules";

export const runtime = "edge";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromCookies(request.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDB();
  const scorecard = await queryFirst<{ template_id: string; is_locked: number }>(
    db,
    `SELECT s.template_id, COALESCE(ss.is_locked, 0) AS is_locked
     FROM scorecards s LEFT JOIN scorecard_settings ss ON ss.scorecard_id = s.id
     WHERE s.id = ?1 AND s.created_by = ?2`,
    [params.id, user.id]
  );
  if (!scorecard) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scorecard.is_locked) return NextResponse.json({ error: "This scorecard is locked" }, { status: 423 });

  const body = await request.json();
  const requestedKeys: string[] = Array.isArray(body.rule_keys)
    ? (body.rule_keys as unknown[]).filter((key): key is string => typeof key === "string")
    : [];
  const [cells, rules] = await Promise.all([
    queryAll(db, "SELECT * FROM template_cells WHERE template_id = ?1 AND sort_order >= 0 ORDER BY sort_order", [scorecard.template_id]),
    queryAll(db, "SELECT * FROM template_rule_sets WHERE template_id = ?1 ORDER BY sort_order", [scorecard.template_id]),
  ]);
  const parsedCells = cells.map((cell: Record<string, unknown>) => ({ ...cell, config_json: JSON.parse(String(cell.config_json || "{}")) }));
  const parsedRules = rules.map((rule: Record<string, unknown>) => ({ ...rule, definition_json: JSON.parse(String(rule.definition_json || "{}")) }));
  const allowedKeys = new Set<string>((parsedRules as any[]).map(rule => String(rule.rule_key)));
  const selectedKeys: string[] = [...new Set(requestedKeys.filter((key: string) => allowedKeys.has(key)))];
  const layout = resolveLayout(parsedCells as any, parsedRules as any, selectedKeys);

  await execute(
    db,
    `INSERT INTO scorecard_layout_snapshots (scorecard_id, cells_json, rules_json)
     VALUES (?1, ?2, ?3)
     ON CONFLICT(scorecard_id) DO UPDATE SET cells_json = excluded.cells_json, rules_json = excluded.rules_json`,
    [params.id, JSON.stringify(layout.cells), JSON.stringify(selectedKeys)]
  );
  await execute(db, "UPDATE scorecards SET updated_at = datetime('now') WHERE id = ?1", [params.id]);
  return NextResponse.json({ cells: layout.cells, rule_keys: selectedKeys });
}
