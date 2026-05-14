import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { syncOSSOrders } from "@/lib/oss-sync";

export async function POST() {
  try {
    await requireOwner();
    const result = await syncOSSOrders();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
