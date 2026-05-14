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

    const suppliers = await prisma.supplier.findMany({
      where,
      include: { _count: { select: { purchaseOrders: true } } },
      orderBy: { createdAt: "asc" },
    });

    const header = ["供应商名称", "联系人", "备注", "采购单数", "添加时间"].join(",");
    const rows = suppliers.map((s) =>
      [
        cell(s.name),
        cell(s.contact),
        cell(s.notes),
        cell(s._count.purchaseOrders),
        cell(s.createdAt.toISOString().split("T")[0]),
      ].join(",")
    );

    const csv = "﻿" + [header, ...rows].join("\n");
    const filename = `供应商_${new Date().toISOString().split("T")[0]}.csv`;

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
