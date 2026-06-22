import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInvestorOrOwner, requireOwner } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function GET(request: NextRequest) {
  try {
    await requireInvestorOrOwner();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    const dateFilter = startDate && endDate
      ? { gte: new Date(startDate), lte: new Date(endDate) }
      : undefined;

    const [records, purchaseOrders, customerOrders] = await Promise.all([
      prisma.financialRecord.findMany({
        where: dateFilter ? { date: dateFilter } : undefined,
        orderBy: { date: "desc" },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          status: "ARRIVED",
          ...(dateFilter ? { arrivedAt: dateFilter } : {}),
        },
        include: { items: true, supplier: true },
      }),
      prisma.customerOrder.findMany({
        where: {
          status: { not: "CANCELLED" },
          ...(dateFilter ? { orderDate: dateFilter } : {}),
        },
        include: { customer: true },
      }),
    ]);

    const manualEntries = records.map((r) => ({ ...r, source: "manual" as const }));

    const purchaseEntries = purchaseOrders.map((po) => ({
      id: `po_${po.id}`,
      type: "EXPENSE",
      amount: po.items.reduce((s, i) => s + i.quantity * i.unitCost, 0) + po.shippingFee,
      description: `采购订单: ${po.supplierOrderNo}${po.supplier ? ` (${po.supplier.name})` : ""}`,
      category: "采购成本",
      date: (po.arrivedAt ?? po.orderedAt).toISOString(),
      createdAt: po.orderedAt.toISOString(),
      source: "purchase" as const,
    }));

    const saleEntries = customerOrders.map((co) => ({
      id: `co_${co.id}`,
      type: "INCOME",
      amount: co.totalRevenue,
      description: `销售订单: ${co.customer.name}`,
      category: "营业收入",
      date: co.orderDate.toISOString(),
      createdAt: co.orderDate.toISOString(),
      source: "sale" as const,
    }));

    const allEntries = [...manualEntries, ...purchaseEntries, ...saleEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json(allEntries);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();
    const data = await request.json();
    const record = await prisma.financialRecord.create({
      data: {
        type: data.type,
        amount: parseFloat(data.amount),
        description: data.description,
        category: data.category || null,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
    logActivity(session.username, "新增财务记录", `${data.type === "INCOME" ? "收入" : "支出"}: ${data.description} $${data.amount}`);
    return NextResponse.json(record, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireOwner();
    const { id } = await request.json();
    const record = await prisma.financialRecord.findUnique({ where: { id }, select: { description: true, type: true } });
    await prisma.financialRecord.delete({ where: { id } });
    logActivity(session.username, "删除财务记录", `${record?.type === "INCOME" ? "收入" : "支出"}: ${record?.description ?? id}`);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
