import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireOwner } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const customerAddress = searchParams.get("customerAddress");

    const orders = await prisma.customerOrder.findMany({
      where: customerAddress ? { customerAddress } : undefined,
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { orderDate: "desc" },
    });
    return NextResponse.json(orders);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();
    const data = await request.json();

    const items = data.items as Array<{
      productId: string;
      productName: string;
      quantity: number;
      standardPrice: number;
      actualPrice: number;
      costPrice: number;
    }>;

    let totalRevenue = 0;
    let totalCost = 0;

    const itemsData = items.map((item) => {
      const qty = parseInt(item.quantity as unknown as string);
      const actual = parseFloat(item.actualPrice as unknown as string);
      const cost = parseFloat(item.costPrice as unknown as string);
      const revenue = actual * qty;
      const itemCost = cost * qty;
      const profit = revenue - itemCost;
      totalRevenue += revenue;
      totalCost += itemCost;
      return {
        productId: item.productId || null,
        productName: item.productName,
        quantity: qty,
        standardPrice: parseFloat(item.standardPrice as unknown as string),
        actualPrice: actual,
        costPrice: cost,
        profit,
      };
    });

    const order = await prisma.customerOrder.create({
      data: {
        customerAddress: data.customerAddress,
        notes: data.notes || null,
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        items: { create: itemsData },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
    logActivity(session.username, "创建销售订单", `客户: ${order.customer.name}`);
    return NextResponse.json(order, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
