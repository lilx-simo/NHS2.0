import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const active = req.nextUrl.searchParams.get("active") === "true";
    const clinicians = await db.managedClinician.findMany({
      where: active ? { active: true } : undefined,
      orderBy: { id: "asc" },
    });
    return NextResponse.json(clinicians);
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const data = await req.json();
    const c = await db.managedClinician.create({ data: {
      name: data.name,
      specialty: data.specialty ?? "General",
      email: data.email ?? "",
      active: data.active ?? true,
    }});
    return NextResponse.json(c, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
