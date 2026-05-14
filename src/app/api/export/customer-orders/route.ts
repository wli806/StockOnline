import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

const STATUS_LABEL: Record<string, string> = { PENDING: "待处理", COMPLETED: "已完成", CANCELLED: "已取消" };

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const canSeeFinancials = session.role === "OWNER" || session.role === "INVESTOR";

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where = start || end ? {
      orderDate: {
        ...(start ? { gte: new Date(start) } : {}),
        ...(end ? { lte: new Date(end + "T23:59:59") } : {}),
      },
    } : {};

    const orders = await prisma.customerOrder.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { orderDate: "desc" },
    });

    const header = [
      "客户姓名", "收货地址", "状态", "商品数", "备注", "下单时间",
      ...(canSeeFinancials ? ["总营收(AUD)", "总利润(AUD)"] : []),
    ].join(",");

    const rows = orders.map((order) => [
      cell(order.customer.name),
      cell(order.customerAddress),
      cell(STATUS_LABEL[order.status] ?? order.status),
      cell(order.items.length),
      cell(order.notes),
      cell(order.orderDate.toISOString().split("T")[0]),
      ...(canSeeFinancials
        ? [cell(order.totalRevenue.toFixed(2)), cell(order.totalProfit.toFixed(2))]
        : []),
    ].join(","));

    const csv = "﻿" + [header, ...rows].join("\n");
    const filename = `销售订单_${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
}
