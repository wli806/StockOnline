import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInvestorOrOwner, requireOwner } from "@/lib/auth";

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
    await requireOwner();
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
    return NextResponse.json(record, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireOwner();
    const { id } = await request.json();
    await prisma.financialRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
