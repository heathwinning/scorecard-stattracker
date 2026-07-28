import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Google's public JWKS endpoint — works in Edge runtime (no Node deps)
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const secretKey = new TextEncoder().encode(SESSION_SECRET);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

// Create a session JWT (valid for 30 days)
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

// Verify a session JWT
export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (!payload.sub || !payload.email) return null;
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: (payload.name as string) || "Unknown",
      avatar_url: null,
    };
  } catch {
    return null;
  }
}

// Verify Google ID token using jose (Edge-compatible)
export async function verifyGoogleToken(
  credential: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: GOOGLE_CLIENT_ID,
    });

    if (!payload.sub || !payload.email) return null;

    return {
      id: payload.sub,
      email: payload.email as string,
      name: (payload.name as string) || "Unknown",
      avatar_url: (payload.picture as string) || null,
    };
  } catch (err) {
    console.error("Google token verification failed:", err);
    return null;
  }
}

// Get user from request cookies
export async function getUserFromCookies(
  cookieHeader: string | null
): Promise<SessionUser | null> {
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  const token = cookies["sc_session"];
  if (!token) return null;

  return verifySessionToken(token);
}

function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  header.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    if (name && rest.length > 0) {
      result[name.trim()] = rest.join("=").trim();
    }
  });
  return result;
}

// Set session cookie header value
export function sessionCookie(token: string): string {
  return `sc_session=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax${
    APP_URL.startsWith("https") ? "; Secure" : ""
  }`;
}

// Clear session cookie
export function clearSessionCookie(): string {
  return "sc_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax";
}

export function getGoogleClientId(): string {
  return GOOGLE_CLIENT_ID;
}
