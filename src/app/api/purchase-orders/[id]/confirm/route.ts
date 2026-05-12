import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireOwner();
    const { id } = await params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    if (order.status === "ARRIVED") return NextResponse.json({ error: "订单已确认到货" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.inventoryItem.upsert({
          where: { productId: item.productId },
          update: { quantity: { increment: item.quantity } },
          create: { productId: item.productId, quantity: item.quantity },
        });
      }
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: "ARRIVED", arrivedAt: new Date() },
      });
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
