import { NextResponse } from "next/server";
import { requireStrictOwner } from "@/lib/auth";
import { syncOSSOrders } from "@/lib/oss-sync";

export async function POST() {
  try {
    await requireStrictOwner();
    const result = await syncOSSOrders();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
