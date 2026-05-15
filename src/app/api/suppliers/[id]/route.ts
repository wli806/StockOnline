import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const data = await request.json();
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name: data.name, contact: data.contact || null, notes: data.notes || null },
    });
    logActivity(session.username, "编辑供应商", supplier.name);
    return NextResponse.json(supplier);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({ where: { id }, select: { name: true } });
    await prisma.supplier.delete({ where: { id } });
    logActivity(session.username, "删除供应商", supplier?.name ?? id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
