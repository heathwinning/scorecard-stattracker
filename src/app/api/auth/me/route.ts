import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies, createGuestSession, sessionCookie } from "@/lib/auth";
import { getDB, execute } from "@/lib/db";
import { readUserProfile } from "@/lib/player-profile";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);

  if (user) {
    // Ensure user exists in DB (session may predate a DB reset)
    const db = getDB();
    await execute(
      db,
      `INSERT OR IGNORE INTO users (id, email, name, avatar_url) VALUES (?1, ?2, ?3, ?4)`,
      [user.id, user.email, user.name, user.avatar_url]
    );
    return NextResponse.json({ user: await readUserProfile(user) }, { headers: { "Cache-Control": "private, no-store" } });
  }

  // Create a silent guest account
  const guest = await createGuestSession();
  const db = getDB();

  // Insert guest into users table so they can own scorecards
  await execute(
    db,
    `INSERT OR IGNORE INTO users (id, email, name, avatar_url) VALUES (?1, ?2, ?3, ?4)`,
    [guest.user.id, guest.user.email, guest.user.name, null]
  );

  const response = NextResponse.json({
    user: await readUserProfile(guest.user),
  }, { headers: { "Cache-Control": "private, no-store" } });

  response.headers.set("Set-Cookie", sessionCookie(guest.token));
  return response;
}
