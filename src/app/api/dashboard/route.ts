import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  try {
    await requireAuth();
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [
      totalProducts,
      lowStockCount,
      pendingPurchaseOrders,
      monthOrders,
      totalCustomers,
      recentOrders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.inventoryItem.count({ where: { quantity: { lte: 5 } } }),
      prisma.purchaseOrder.count({ where: { status: "PENDING" } }),
      prisma.customerOrder.findMany({
        where: { orderDate: { gte: monthStart, lte: monthEnd }, status: { not: "CANCELLED" } },
      }),
      prisma.customer.count(),
      prisma.customerOrder.findMany({
        take: 5,
        orderBy: { orderDate: "desc" },
        include: { customer: true },
      }),
    ]);

    const monthRevenue = monthOrders.reduce((s, o) => s + o.totalRevenue, 0);
    const monthProfit = monthOrders.reduce((s, o) => s + o.totalProfit, 0);

    return NextResponse.json({
      totalProducts,
      lowStockCount,
      pendingPurchaseOrders,
      monthRevenue,
      monthProfit,
      monthOrderCount: monthOrders.length,
      totalCustomers,
      recentOrders,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
