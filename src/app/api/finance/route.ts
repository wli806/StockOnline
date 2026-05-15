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

    const records = await prisma.financialRecord.findMany({
      where:
        startDate && endDate
          ? { date: { gte: new Date(startDate), lte: new Date(endDate) } }
          : undefined,
      orderBy: { date: "desc" },
    });
    return NextResponse.json(records);
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
