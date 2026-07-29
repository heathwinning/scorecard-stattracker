import { NextRequest, NextResponse } from "next/server";
import {
  verifyGoogleToken,
  createSessionToken,
  sessionCookie,
  getUserFromCookies,
} from "@/lib/auth";
import { getDB, execute, uuid } from "@/lib/db";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: "Missing Google credential" },
        { status: 400 }
      );
    }

    const googleUser = await verifyGoogleToken(credential);
    if (!googleUser) {
      return NextResponse.json(
        { error: "Invalid Google token" },
        { status: 401 }
      );
    }

    const db = getDB();
    const cookieHeader = request.headers.get("cookie");
    const existingUser = await getUserFromCookies(cookieHeader);

    // If the current session is a guest, migrate their data to the Google account
    if (existingUser && existingUser.email?.startsWith("guest-")) {
      const guestId = existingUser.id;

      // Update or insert the Google user
      await execute(
        db,
        `INSERT INTO users (id, email, name, avatar_url) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET email = ?2, name = ?3, avatar_url = ?4`,
        [googleUser.id, googleUser.email, googleUser.name, googleUser.avatar_url]
      );

      // Migrate guest's scorecards to the Google user
      await execute(
        db,
        `UPDATE scorecards SET created_by = ?1 WHERE created_by = ?2`,
        [googleUser.id, guestId]
      );

      // Migrate guest's templates to the Google user
      await execute(
        db,
        `UPDATE templates SET created_by = ?1 WHERE created_by = ?2`,
        [googleUser.id, guestId]
      );

      // Remove the old guest user record
      await execute(db, `DELETE FROM users WHERE id = ?1`, [guestId]);
    } else {
      // Just upsert the Google user
      await execute(
        db,
        `INSERT OR IGNORE INTO users (id, email, name, avatar_url) VALUES (?1, ?2, ?3, ?4)`,
        [googleUser.id, googleUser.email, googleUser.name, googleUser.avatar_url]
      );
    }

    const token = await createSessionToken(googleUser);

    const response = NextResponse.json({
      user: {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatar_url: googleUser.avatar_url,
      },
    });

    response.headers.set("Set-Cookie", sessionCookie(token));
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
