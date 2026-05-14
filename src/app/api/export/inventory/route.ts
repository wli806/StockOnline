import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

const TYPE_MAP: Record<string, string> = { wine: "酒", pokemon: "宝可梦卡片", other: "其他" };

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where = start || end ? {
      createdAt: {
        ...(start ? { gte: new Date(start) } : {}),
        ...(end ? { lte: new Date(end + "T23:59:59") } : {}),
      },
    } : {};

    const products = await prisma.product.findMany({
      where,
      include: { inventoryItem: true },
      orderBy: { createdAt: "asc" },
    });

    const header = ["商品名", "类型", "当前库存", "单位", "标准售价(AUD)", "描述", "添加时间"].join(",");
    const rows = products.map((p) =>
      [
        cell(p.name),
        cell(TYPE_MAP[p.type] || p.type),
        cell(p.inventoryItem?.quantity ?? 0),
        cell(p.unit),
        cell(p.standardPrice.toFixed(2)),
        cell(p.description),
        cell(p.createdAt.toISOString().split("T")[0]),
      ].join(",")
    );

    const csv = "﻿" + [header, ...rows].join("\n");
    const filename = `库存_${new Date().toISOString().split("T")[0]}.csv`;

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
