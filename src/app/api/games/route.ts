import { NextResponse } from "next/server";
import { getDB, queryAll } from "@/lib/db";

export const runtime = "edge";

// GET /api/games — list all games in the catalog
export async function GET() {
  const db = getDB();
  const games = await queryAll(
    db,
    "SELECT * FROM games ORDER BY category, name"
  );
  return NextResponse.json({ games });
}
