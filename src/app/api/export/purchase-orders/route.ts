import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInvestorOrOwner } from "@/lib/auth";

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

const STATUS_LABEL: Record<string, string> = { PENDING: "等待到货", ARRIVED: "已到货" };

export async function GET(request: NextRequest) {
  try {
    await requireInvestorOrOwner();
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where = start || end ? {
      orderedAt: {
        ...(start ? { gte: new Date(start) } : {}),
        ...(end ? { lte: new Date(end + "T23:59:59") } : {}),
      },
    } : {};

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: true },
      orderBy: { orderedAt: "desc" },
    });

    const header = ["订单号", "供应商", "状态", "商品名", "数量", "进价(AUD)", "小计(AUD)", "备注", "下单时间", "到货时间"].join(",");

    const rows: string[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        rows.push([
          cell(order.supplierOrderNo),
          cell(order.supplier?.name ?? "未指定"),
          cell(STATUS_LABEL[order.status] ?? order.status),
          cell(item.productName),
          cell(item.quantity),
          cell(item.unitCost.toFixed(2)),
          cell((item.quantity * item.unitCost).toFixed(2)),
          cell(order.notes),
          cell(order.orderedAt.toISOString().split("T")[0]),
          cell(order.arrivedAt ? order.arrivedAt.toISOString().split("T")[0] : ""),
        ].join(","));
      }
    }

    const csv = "﻿" + [header, ...rows].join("\n");
    const filename = `采购订单_${new Date().toISOString().split("T")[0]}.csv`;

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
