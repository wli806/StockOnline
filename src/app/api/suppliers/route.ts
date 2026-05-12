import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireOwner } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(suppliers);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner();
    const data = await request.json();
    const supplier = await prisma.supplier.create({
      data: { name: data.name, contact: data.contact || null, notes: data.notes || null },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
