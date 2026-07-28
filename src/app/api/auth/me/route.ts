import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromCookies(cookieHeader);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    },
  });
}
