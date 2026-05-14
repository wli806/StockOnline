import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  try {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where = start || end ? {
      createdAt: {
        ...(start ? { gte: new Date(start) } : {}),
        ...(end ? { lte: new Date(end + "T23:59:59") } : {}),
      },
    } : {};

    const customers = await prisma.customer.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "asc" },
    });

    const header = ["收货地址", "姓名", "电话", "备注", "订单数", "加入时间"].join(",");
    const rows = customers.map((c) =>
      [
        cell(c.address),
        cell(c.name),
        cell(c.phone),
        cell(c.notes),
        cell(c._count.orders),
        cell(c.createdAt.toISOString().split("T")[0]),
      ].join(",")
    );

    const csv = "﻿" + [header, ...rows].join("\n");
    const filename = `客户_${new Date().toISOString().split("T")[0]}.csv`;

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
