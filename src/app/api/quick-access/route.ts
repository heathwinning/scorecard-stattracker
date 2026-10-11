import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryAll } from "@/lib/db";

export const runtime = "edge";

const MAX_QUICK_CARDS = 8;

// GET /api/quick-access - quick-start cards for the signed-in user
export async function GET(request: NextRequest) {
  const user = await getUserFromCookies(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const preferred = await queryAll(
    db,
    `SELECT t.id, t.name, g.icon as game_icon, g.name as game_name
     FROM user_quick_access q
     JOIN templates t ON q.template_id = t.id
     LEFT JOIN games g ON t.game_id = g.id
     WHERE q.user_id = ?1
     ORDER BY q.sort_order`,
    [user.id]
  );
  const frequent = await queryAll(
    db,
    `SELECT t.id, t.name, g.icon as game_icon, g.name as game_name, COUNT(s.id) as uses
     FROM scorecards s
     JOIN templates t ON s.template_id = t.id
     LEFT JOIN games g ON t.game_id = g.id
     WHERE s.created_by = ?1
     GROUP BY t.id
     ORDER BY uses DESC, MAX(s.created_at) DESC
     LIMIT ?2`,
    [user.id, MAX_QUICK_CARDS]
  );
  const options = await queryAll(
    db,
    `SELECT t.id, t.name, g.icon as game_icon, g.name as game_name
     FROM templates t
     LEFT JOIN games g ON t.game_id = g.id
     WHERE t.is_public = 1 OR t.created_by = ?1
     ORDER BY t.name
     LIMIT 200`,
    [user.id]
  );

  return NextResponse.json({ preferred: preferred.length > 0 ? preferred : null, frequent, options, max: MAX_QUICK_CARDS });
}

// PUT /api/quick-access - replace preferences; an empty list restores the most-used cards
export async function PUT(request: NextRequest) {
  const user = await getUserFromCookies(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const requested: unknown[] = Array.isArray(body?.template_ids) ? body.template_ids : [];
  const templateIds = [...new Set(requested.filter((id): id is string => typeof id === "string"))].slice(0, MAX_QUICK_CARDS);

  const db = getDB();
  let accessibleIds: string[] = [];
  if (templateIds.length > 0) {
    const placeholders = templateIds.map((_, index) => `?${index + 2}`).join(",");
    const accessible = await queryAll<{ id: string }>(
      db,
      `SELECT id FROM templates WHERE (is_public = 1 OR created_by = ?1) AND id IN (${placeholders})`,
      [user.id, ...templateIds]
    );
    const accessibleSet = new Set(accessible.map((row) => row.id));
    accessibleIds = templateIds.filter((id) => accessibleSet.has(id));
  }

  await db.batch([
    db.prepare("DELETE FROM user_quick_access WHERE user_id = ?1").bind(user.id),
    ...accessibleIds.map((templateId, index) =>
      db
        .prepare("INSERT INTO user_quick_access (user_id, template_id, sort_order) VALUES (?1, ?2, ?3)")
        .bind(user.id, templateId, index)
    ),
  ]);

  return NextResponse.json({ success: true });
}
