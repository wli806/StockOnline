import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const order = await prisma.purchaseOrder.findUnique({ where: { id }, select: { supplierOrderNo: true } });
    await prisma.purchaseOrder.delete({ where: { id } });
    logActivity(session.username, "删除采购订单", `单号: ${order?.supplierOrderNo ?? id}`);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
