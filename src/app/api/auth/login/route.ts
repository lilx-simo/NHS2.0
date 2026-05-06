import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, sessionCookieOptions } from "@/lib/auth-server";
import { checkLockoutServer, recordFailedServer, clearAttemptsServer } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ error: "Username and password required." }, { status: 400 });

    const lockout = checkLockoutServer(username);
    if (lockout.locked)
      return NextResponse.json(
        { error: `Too many failed attempts. Locked for ${lockout.minutesLeft} more minute${lockout.minutesLeft === 1 ? "" : "s"}.` },
        { status: 429 }
      );

    const user = await db.user.findUnique({ where: { username: username.toLowerCase().trim() } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      const result = recordFailedServer(username);
      const msg = result.locked
        ? "Too many failed attempts. Account locked for 15 minutes."
        : `Invalid username or password.${result.attemptsLeft > 0 && result.attemptsLeft <= 3 ? ` ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} remaining.` : ""}`;
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    clearAttemptsServer(username);
    const token = await signToken({ userId: user.id, role: user.role });
    const res = NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role, username: user.username },
    });
    res.cookies.set(sessionCookieOptions(token));
    // Update last login timestamp
    await db.user.update({ where: { id: user.id }, data: {} }).catch(() => {});
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
