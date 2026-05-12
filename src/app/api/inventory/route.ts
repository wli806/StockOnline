import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireOwner } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const items = await prisma.inventoryItem.findMany({
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    });
    return NextResponse.json(items);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireOwner();
    const { productId, quantity } = await request.json();
    const item = await prisma.inventoryItem.update({
      where: { productId },
      data: { quantity: parseInt(quantity) },
      include: { product: true },
    });
    return NextResponse.json(item);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
