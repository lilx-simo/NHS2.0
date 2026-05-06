import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const data = await req.json();
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.username !== undefined) updateData.username = data.username.toLowerCase();
    if (data.password) updateData.password = await bcrypt.hash(data.password, 12);
    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, name: true, email: true, role: true, department: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const { id } = await params;
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
