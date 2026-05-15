import { prisma } from "./prisma";

const BASE = "https://oss.spientsyserv.com";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ossDateFmt(d: Date): string {
  return `${String(d.getDate()).padStart(2,"0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

// FY2026: week 1 starts March 30, 2026
function getFiscalWeek(d: Date): number {
  const fy2026Start = new Date("2026-03-30").getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((d.getTime() - fy2026Start) / weekMs) + 1);
}

async function ossLogin(): Promise<string> {
  const username = process.env.OSS_USERNAME ?? "";
  const password = process.env.OSS_PASSWORD ?? "";
  if (!username || !password) throw new Error("OSS 登录失败：OSS_USERNAME 或 OSS_PASSWORD 未配置");

  const res = await fetch(`${BASE}/common/login/attemptlogin`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
    redirect: "manual",
  });

  // Try Set-Cookie header first; some CI environments expose multiple values via getSetCookie()
  let cookie = res.headers.get("set-cookie") ?? "";
  if (!cookie && typeof (res.headers as unknown as Record<string, unknown>).getSetCookie === "function") {
    cookie = ((res.headers as unknown as { getSetCookie(): string[] }).getSetCookie()).join("; ");
  }

  const m = cookie.match(/ci_session=([^;]+)/);
  if (!m) {
    const location = res.headers.get("location") ?? "(none)";
    throw new Error(
      `OSS 登录失败 [HTTP ${res.status}, Location: ${location}, Set-Cookie: ${cookie.substring(0, 120) || "(empty)"}] — 请检查账号密码及服务器网络连通性`
    );
  }
  return m[1];
}

interface RawOrder {
  id: string;
  poNumber: string;
  supplier: string;
  status: number;
  poDate: string;
  deliveryDate: string | null;
  orderDate: string;
  weekNo: number;
  year: number;
}

function parseNormalOrders(tbody: string, weekNo: number, year: number): RawOrder[] {
  const orders: RawOrder[] = [];
  const rows = tbody.split(/<\/tr>/i);
  for (const row of rows) {
    const idMatch = row.match(/editorder\/(\d+)/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const tdTexts = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    const poNumber = tdTexts[6] ?? "";
    const supplierRaw = tdTexts[2] ?? "";
    const supplier = supplierRaw.replace(/^[A-Z]\s+/, "").trim();
    orders.push({ id, poNumber, supplier, status: 2, poDate: "", deliveryDate: null, orderDate: "", weekNo, year });
  }
  return orders;
}

export async function syncOSSOrders(): Promise<{ synced: number; errors: string[] }> {
  const session = await ossLogin();
  const now = new Date();
  const weekNo = getFiscalWeek(now);
  const year = now.getFullYear();

  const listRes = await fetch(`${BASE}/shop/home/getTemplates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": `ci_session=${session}`,
    },
    body: new URLSearchParams({
      week: String(weekNo),
      year: String(year),
      type: "all",
      last_row: "",
      dailypo_week_no: String(weekNo),
      dailypo_year: String(year),
      dailypo_selected_day: ossDateFmt(now),
      supplier_id: "0",
    }),
  });

  const listData = await listRes.json();

  interface OSSTemplate {
    id: string | null;
    po_number: string | null;
    display_name: string;
    supplier_name: string;
    po_status: string;
    po_date: string;
    delivery_date: string | null;
    order_date: string;
    week_no: string;
    year: string;
  }

  const dailyOrders: RawOrder[] = ((listData.dailypo_template ?? []) as OSSTemplate[])
    .filter(o => o.id !== null)
    .map(o => ({
      id: o.id!,
      poNumber: o.po_number ?? "",
      supplier: o.display_name || o.supplier_name,
      status: parseInt(o.po_status),
      poDate: o.po_date,
      deliveryDate: o.delivery_date,
      orderDate: o.order_date,
      weekNo: parseInt(o.week_no),
      year: parseInt(o.year),
    }));

  const tbody: string = listData.tbody ?? "";
  const normalOrders = parseNormalOrders(tbody, weekNo, year);
  const dailyIds = new Set(dailyOrders.map(o => o.id));
  const allOrders = [...dailyOrders, ...normalOrders.filter(o => !dailyIds.has(o.id))];

  const errors: string[] = [];
  let synced = 0;

  for (let i = 0; i < allOrders.length; i += 5) {
    const batch = allOrders.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (order) => {
        const r = await fetch(`${BASE}/shop/home/getExistingItems`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": `ci_session=${session}`,
          },
          body: new URLSearchParams({ headerid: order.id }),
        });
        const text = await r.text();
        let items: Record<string, string>[] = [];
        try {
          const parsed = JSON.parse(text);
          items = Array.isArray(parsed) ? parsed : [];
        } catch { items = []; }
        return { order, items };
      })
    );

    for (const result of results) {
      if (result.status === "rejected") { errors.push(String(result.reason)); continue; }
      const { order, items } = result.value;
      try {
        const dbOrder = await prisma.sushiOrder.upsert({
          where: { ossId: order.id },
          update: {
            poNumber: order.poNumber,
            supplierName: order.supplier,
            status: order.status,
            poDate: order.poDate || null,
            deliveryDate: order.deliveryDate,
            orderDate: order.orderDate || null,
            weekNo: order.weekNo,
            year: order.year,
            syncedAt: new Date(),
          },
          create: {
            ossId: order.id,
            poNumber: order.poNumber,
            supplierName: order.supplier,
            status: order.status,
            poDate: order.poDate || null,
            deliveryDate: order.deliveryDate,
            orderDate: order.orderDate || null,
            weekNo: order.weekNo,
            year: order.year,
          },
        });
        await prisma.sushiOrderItem.deleteMany({ where: { orderId: dbOrder.id } });
        if (items.length > 0) {
          await prisma.sushiOrderItem.createMany({
            data: items.map(item => ({
              orderId: dbOrder.id,
              ossItemId: String(item.id ?? ""),
              itemCode: item.item_code ?? "",
              itemName: item.item_name ?? item.supplier_item_name ?? "",
              uom: item.uom_name ?? "",
              quantity: parseFloat(item.qty ?? "0"),
            })),
          });
        }
        synced++;
      } catch (e) {
        errors.push(`Order ${order.id}: ${String(e)}`);
      }
    }
  }

  return { synced, errors };
}
