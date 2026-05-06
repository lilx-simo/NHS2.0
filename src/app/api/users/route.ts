import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireRole(["admin", "planner"]);
    const users = await db.user.findMany({
      select: { id: true, username: true, name: true, email: true, role: true, department: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const data = await req.json();
    const { username, password, name, email, role, department } = data;
    if (!username || !password || !name || !role)
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    const existing = await db.user.findUnique({ where: { username: username.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Username already taken." }, { status: 409 });
    const hashed = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { username: username.toLowerCase(), password: hashed, name, email: email ?? "", role, department: department ?? "" },
      select: { id: true, username: true, name: true, email: true, role: true, department: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
