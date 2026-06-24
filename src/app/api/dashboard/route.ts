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
      monthFinance,
      totalCustomers,
      recentOrders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.inventoryItem.count({ where: { quantity: { lte: 5 } } }),
      prisma.purchaseOrder.count({ where: { status: "PENDING" } }),
      prisma.customerOrder.findMany({
        where: { orderDate: { gte: monthStart, lte: monthEnd }, status: { not: "CANCELLED" } },
      }),
      prisma.financialRecord.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.customer.count(),
      prisma.customerOrder.findMany({
        take: 5,
        orderBy: { orderDate: "desc" },
        include: { customer: true },
      }),
    ]);

    const monthRevenue = monthOrders.reduce((s, o) => s + o.totalRevenue, 0);
    const monthSalesProfit = monthOrders.reduce((s, o) => s + o.totalProfit, 0);
    const monthManualIncome = monthFinance.filter((f) => f.type === "INCOME").reduce((s, f) => s + f.amount, 0);
    const monthManualExpense = monthFinance.filter((f) => f.type === "EXPENSE").reduce((s, f) => s + f.amount, 0);
    const monthProfit = monthSalesProfit + monthManualIncome - monthManualExpense;

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
