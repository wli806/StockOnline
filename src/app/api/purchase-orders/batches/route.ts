import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// 返回指定商品的所有「已到货」采购批次
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "需要 productId" }, { status: 400 });
    }

    const batches = await prisma.purchaseOrderItem.findMany({
      where: {
        productId,
        purchaseOrder: { status: "ARRIVED" },
      },
      include: {
        purchaseOrder: {
          select: { id: true, supplierOrderNo: true, arrivedAt: true, orderedAt: true },
        },
      },
      orderBy: { purchaseOrder: { arrivedAt: "desc" } },
    });

    return NextResponse.json(batches);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
