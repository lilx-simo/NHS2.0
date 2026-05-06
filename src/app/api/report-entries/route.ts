import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin", "planner"]);
    const weekStart = req.nextUrl.searchParams.get("weekStart");
    const entries = await db.reportEntry.findMany({
      where: weekStart ? { weekStart } : undefined,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(entries);
  } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["admin", "planner"]);
    const data = await req.json();
    const e = await db.reportEntry.create({ data: {
      clinician: data.clinician,
      clinicType: data.clinicType,
      deliveredSessions: String(data.deliveredSessions),
      rootCause: data.rootCause ?? "",
      weekStart: data.weekStart,
    }});
    return NextResponse.json(e, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
