import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { execute, getDB } from "@/lib/db";
import { cleanPlayerName, MAX_GROUP_SOURCES, MAX_PLAYER_NAME_LENGTH, parsePlayerSource } from "@/lib/player-names";

export const runtime = "edge";

const validId = (id: string) => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id);

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromCookies(request.headers.get("cookie"));
  if (!user || user.email.startsWith("guest-")) {
    return NextResponse.json({ error: "Sign in to save your player names." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? cleanPlayerName(body.name) : "";
  if (!validId(params.id) || !name || name.length > MAX_PLAYER_NAME_LENGTH) {
    return NextResponse.json({ error: `Enter a canonical name of up to ${MAX_PLAYER_NAME_LENGTH} characters.` }, { status: 400 });
  }
  if (!Array.isArray(body.sources) || !body.sources.length || body.sources.length > MAX_GROUP_SOURCES
    || !body.sources.every((key: unknown) => typeof key === "string" && parsePlayerSource(key))) {
    return NextResponse.json({ error: "Choose at least one valid name or account for this player." }, { status: 400 });
  }
  const sources = [...new Set<string>(body.sources)];
  const db = getDB();
  try {
    await db.batch([
      db.prepare(`INSERT INTO player_name_groups (viewer_id, id, name) VALUES (?1, ?2, ?3)
        ON CONFLICT(viewer_id, id) DO UPDATE SET name = excluded.name`).bind(user.id, params.id, name),
      db.prepare("DELETE FROM player_name_group_members WHERE viewer_id = ?1 AND group_id = ?2").bind(user.id, params.id),
      db.prepare(`INSERT INTO player_name_group_members (viewer_id, group_id, source_key)
        SELECT ?1, ?2, value FROM json_each(?3)`).bind(user.id, params.id, JSON.stringify(sources)),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: player_name_group_members")) {
      return NextResponse.json({ error: "A selected player is already in another group. Remove them from that group first." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ group: { id: params.id, name, sources } });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromCookies(request.headers.get("cookie"));
  if (!user || user.email.startsWith("guest-")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validId(params.id)) return NextResponse.json({ error: "Invalid name group" }, { status: 400 });
  await execute(getDB(), "DELETE FROM player_name_groups WHERE viewer_id = ?1 AND id = ?2", [user.id, params.id]);
  return NextResponse.json({ success: true });
}
