import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryAll, uuid, execute } from "@/lib/db";
import { resolveLayout } from "@/lib/layout-rules";

export const runtime = "edge";

// GET /api/scorecards - list user's scorecards
export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const scorecards = await queryAll(
    db,
    `SELECT s.*, t.name as template_name
     FROM scorecards s
     JOIN templates t ON s.template_id = t.id
     WHERE s.created_by = ?1
     ORDER BY s.game_date DESC
     LIMIT 50`,
    [user.id]
  );

  return NextResponse.json({ scorecards });
}

// POST /api/scores - create a new scorecard (open to all — guests and signed-in)
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);

  const db = getDB();
  const body = await request.json();
  const { template_id, title, game_date, notes, rule_keys = [] } = body;

  if (!template_id) {
    return NextResponse.json({ error: "template_id is required" }, { status: 400 });
  }

  // Ensure the user exists in the DB (guest sessions may predate a DB reset)
  if (user) {
    await db
      .prepare(`INSERT OR IGNORE INTO users (id, email, name, avatar_url) VALUES (?1, ?2, ?3, ?4)`)
      .bind(user.id, user.email, user.name, user.avatar_url)
      .run();
  }

  const scorecardId = uuid();

  await db
    .prepare(
      `INSERT INTO scorecards (id, template_id, created_by, title, game_date, notes)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
    .bind(
      scorecardId,
      template_id,
      user?.id || null,
      (title || "").trim(),
      game_date || new Date().toISOString(),
      (notes || "").trim()
    )
    .run();

  const cells = await queryAll(db, "SELECT * FROM template_cells WHERE template_id = ?1 AND sort_order >= 0 ORDER BY sort_order", [template_id]);
  const rules = await queryAll(db, "SELECT * FROM template_rule_sets WHERE template_id = ?1 ORDER BY sort_order", [template_id]);
  const parsedCells = cells.map((cell: Record<string, unknown>) => ({ ...cell, config_json: JSON.parse(String(cell.config_json || "{}")) }));
  const parsedRules = rules.map((rule: Record<string, unknown>) => ({ ...rule, rule_key: String(rule.rule_key), definition_json: JSON.parse(String(rule.definition_json || "{}")) }));
  const allowedRuleKeys = new Set(parsedRules.map((rule: { rule_key: string }) => rule.rule_key));
  const selectedRuleKeys = Array.isArray(rule_keys)
    ? rule_keys.filter((key): key is string => typeof key === "string" && allowedRuleKeys.has(key))
    : [];
  const resolved = resolveLayout(parsedCells as any, parsedRules as any, selectedRuleKeys);
  await execute(
    db,
    "INSERT INTO scorecard_layout_snapshots (scorecard_id, cells_json, rules_json) VALUES (?1, ?2, ?3)",
    [scorecardId, JSON.stringify(resolved.cells), JSON.stringify(resolved.selectedRules.map(rule => rule.rule_key))]
  );

  return NextResponse.json({ scorecard: { id: scorecardId, ...body } }, { status: 201 });
}
