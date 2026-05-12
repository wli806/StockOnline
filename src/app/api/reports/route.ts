import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInvestorOrOwner } from "@/lib/auth";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    await requireInvestorOrOwner();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "month"; // week | month
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    if (type === "week") {
      const monthStart = startOfMonth(new Date(year, month - 1, 1));
      const monthEnd = endOfMonth(new Date(year, month - 1, 1));
      const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

      const weeklyData = await Promise.all(
        weeks.map(async (weekStart) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const clampedStart = weekStart < monthStart ? monthStart : weekStart;
          const clampedEnd = weekEnd > monthEnd ? monthEnd : weekEnd;

          const orders = await prisma.customerOrder.findMany({
            where: { orderDate: { gte: clampedStart, lte: clampedEnd }, status: { not: "CANCELLED" } },
          });
          const finance = await prisma.financialRecord.findMany({
            where: { date: { gte: clampedStart, lte: clampedEnd } },
          });

          const revenue = orders.reduce((s, o) => s + o.totalRevenue, 0);
          const profit = orders.reduce((s, o) => s + o.totalProfit, 0);
          const income = finance.filter((f) => f.type === "INCOME").reduce((s, f) => s + f.amount, 0);
          const expense = finance.filter((f) => f.type === "EXPENSE").reduce((s, f) => s + f.amount, 0);

          return {
            label: `${format(clampedStart, "MM/dd")}-${format(clampedEnd, "MM/dd")}`,
            revenue,
            profit,
            income,
            expense,
            net: profit + income - expense,
          };
        })
      );
      return NextResponse.json(weeklyData);
    }

    const monthsInterval = { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
    const months = eachMonthOfInterval(monthsInterval);

    const monthlyData = await Promise.all(
      months.map(async (mStart) => {
        const mEnd = endOfMonth(mStart);
        const orders = await prisma.customerOrder.findMany({
          where: { orderDate: { gte: mStart, lte: mEnd }, status: { not: "CANCELLED" } },
        });
        const finance = await prisma.financialRecord.findMany({
          where: { date: { gte: mStart, lte: mEnd } },
        });

        const revenue = orders.reduce((s, o) => s + o.totalRevenue, 0);
        const profit = orders.reduce((s, o) => s + o.totalProfit, 0);
        const income = finance.filter((f) => f.type === "INCOME").reduce((s, f) => s + f.amount, 0);
        const expense = finance.filter((f) => f.type === "EXPENSE").reduce((s, f) => s + f.amount, 0);

        return {
          label: format(mStart, "yyyy年M月"),
          revenue,
          profit,
          income,
          expense,
          net: profit + income - expense,
        };
      })
    );
    return NextResponse.json(monthlyData);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
