import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireOwner } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const order = await prisma.customerOrder.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } },
    });
    if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    return NextResponse.json(order);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const data = await request.json();

    if (data.status) {
      const order = await prisma.customerOrder.update({
        where: { id },
        data: { status: data.status },
        include: { customer: true },
      });
      logActivity(session.username, "更新销售订单状态", `客户: ${order.customer.name}, 状态: ${data.status}`);
      return NextResponse.json(order);
    }

    return NextResponse.json({ error: "无效操作" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const order = await prisma.customerOrder.findUnique({ where: { id }, include: { customer: true } });
    await prisma.customerOrder.delete({ where: { id } });
    logActivity(session.username, "删除销售订单", `客户: ${order?.customer.name ?? id}`);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
