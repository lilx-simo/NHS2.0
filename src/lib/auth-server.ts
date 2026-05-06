import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production-min-32-chars!!"
);

export const COOKIE = "nhs-token";
const EXPIRES_S = 30 * 60; // 30 min

export interface SessionPayload {
  userId: string;
  role: string;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_S}s`)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function requireRole(role: string | string[]): Promise<SessionPayload> {
  const session = await requireSession();
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(session.role)) throw new Error("Forbidden");
  return session;
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: EXPIRES_S,
    path: "/",
  };
}

export function clearCookieOptions() {
  return { name: COOKIE, value: "", maxAge: 0, path: "/" };
}

// Get full User object from session (for /api/auth/me etc)
export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, name: true, email: true, role: true, department: true, createdAt: true },
  });
}
