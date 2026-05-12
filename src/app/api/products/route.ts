import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireOwner } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const products = await prisma.product.findMany({
      include: { inventoryItem: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner();
    const data = await request.json();
    const product = await prisma.product.create({
      data: {
        name: data.name,
        type: data.type,
        standardPrice: parseFloat(data.standardPrice),
        unit: data.unit || "瓶",
        description: data.description || null,
        inventoryItem: { create: { quantity: 0 } },
      },
      include: { inventoryItem: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
