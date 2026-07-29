import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies, createGuestSession, sessionCookie } from "@/lib/auth";
import { getDB, execute } from "@/lib/db";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);

  if (user) {
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
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
    user: {
      id: guest.user.id,
      email: guest.user.email,
      name: guest.user.name,
      avatar_url: null,
    },
  });

  response.headers.set("Set-Cookie", sessionCookie(guest.token));
  return response;
}
