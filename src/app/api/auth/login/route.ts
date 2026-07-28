import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleToken, createSessionToken, sessionCookie } from "@/lib/auth";

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

    const user = await verifyGoogleToken(credential);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid Google token" },
        { status: 401 }
      );
    }

    const token = await createSessionToken(user);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
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
