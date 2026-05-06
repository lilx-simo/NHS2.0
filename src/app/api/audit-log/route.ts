import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireRole(["admin", "planner"]);
    const logs = await db.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 500,
      select: { id: true, name: true, action: true, timestamp: true },
    });
    return NextResponse.json(logs);
  } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { action } = await req.json();
    if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });
    const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    const log = await db.auditLog.create({
      data: { userId: session.userId, name: user?.name ?? "Unknown", action },
    });
    return NextResponse.json(log, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE() {
  try {
    await requireRole("admin");
    await db.auditLog.deleteMany();
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
}
