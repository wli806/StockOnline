import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";

export async function GET() {
  try {
    await requireOwner();
    const customers = await prisma.customer.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(customers);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner();
    const data = await request.json();
    const customer = await prisma.customer.create({
      data: {
        address: data.address,
        name: data.name,
        phone: data.phone || null,
        notes: data.notes || null,
      },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
