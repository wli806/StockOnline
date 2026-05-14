import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireOwner } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { orderedAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner();
    const data = await request.json();
    const order = await prisma.purchaseOrder.create({
      data: {
        supplierOrderNo: data.supplierOrderNo,
        supplierId: data.supplierId || null,
        notes: data.notes || null,
        shippingFee: parseFloat(data.shippingFee ?? 0),
        items: {
          create: data.items.map((item: { productId: string; productName: string; quantity: number; unitCost: number }) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: parseInt(item.quantity as unknown as string),
            unitCost: parseFloat(item.unitCost as unknown as string),
          })),
        },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
