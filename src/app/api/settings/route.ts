import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireSession();
    const s = await db.appSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    return NextResponse.json(s);
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const data = await req.json();
    const s = await db.appSettings.upsert({
      where: { id: "singleton" },
      update: {
        orgName: data.orgName,
        varianceAmber: data.varianceAmber,
        varianceRed: data.varianceRed,
        autoJumpToCurrentWeek: data.autoJumpToCurrentWeek,
      },
      create: { id: "singleton", ...data },
    });
    return NextResponse.json(s);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
