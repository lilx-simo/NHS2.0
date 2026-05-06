import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin", "planner"]);
    const weekStart = req.nextUrl.searchParams.get("weekStart");
    const sessions = await db.additionalSession.findMany({
      where: weekStart ? { weekStart } : undefined,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(sessions);
  } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["admin", "planner"]);
    const data = await req.json();
    const s = await db.additionalSession.create({ data: {
      clinician: data.clinician,
      clinicType: data.clinicType,
      date: data.date,
      reason: data.reason ?? "",
      weekStart: data.weekStart,
    }});
    return NextResponse.json(s, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
