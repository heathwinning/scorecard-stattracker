import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { execute, getDB } from "@/lib/db";
import { cleanPlayerName, MAX_PLAYER_NAME_LENGTH } from "@/lib/player-names";
import { readUserProfile } from "@/lib/player-profile";

export const runtime = "edge";

export async function PUT(request: NextRequest) {
  const user = await getUserFromCookies(request.headers.get("cookie"));
  if (!user || user.email.startsWith("guest-")) {
    return NextResponse.json({ error: "Sign in to edit your profile." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.player_name !== "string") {
    return NextResponse.json({ error: "Enter a player name." }, { status: 400 });
  }
  const name = cleanPlayerName(body.player_name);
  if (name.length > MAX_PLAYER_NAME_LENGTH) {
    return NextResponse.json({ error: `Use up to ${MAX_PLAYER_NAME_LENGTH} characters.` }, { status: 400 });
  }

  await execute(getDB(), `INSERT INTO user_player_profiles (user_id, player_name) VALUES (?1, ?2)
    ON CONFLICT(user_id) DO UPDATE SET player_name = excluded.player_name`, [user.id, name || null]);
  return NextResponse.json({ user: await readUserProfile(user) }, { headers: { "Cache-Control": "private, no-store" } });
}
