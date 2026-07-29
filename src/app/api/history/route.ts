import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { getDB, queryAll, uuid } from "@/lib/db";

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

// POST /api/scorecards - create a new scorecard
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const body = await request.json();
  const { template_id, title, game_date, notes } = body;

  if (!template_id) {
    return NextResponse.json({ error: "template_id is required" }, { status: 400 });
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
      user.id,
      (title || "").trim(),
      game_date || new Date().toISOString(),
      (notes || "").trim()
    )
    .run();

  return NextResponse.json({ scorecard: { id: scorecardId, ...body } }, { status: 201 });
}
