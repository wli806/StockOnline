"use client";

import { useEffect, useState, useMemo } from "react";
import { RefreshCw, UtensilsCrossed, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { format } from "date-fns";

interface SushiItem {
  id: string; ossItemId: string; itemCode: string; itemName: string; uom: string; quantity: number;
}
interface SushiOrder {
  id: string; ossId: string; poNumber: string; supplierName: string; status: number;
  poDate: string | null; deliveryDate: string | null; orderDate: string | null;
  weekNo: number | null; year: number | null; syncedAt: string; items: SushiItem[];
}

const STATUS_MAP: Record<number, { label: string; cls: string }> = {
  1: { label: "待下单", cls: "bg-slate-100 text-slate-500" },
  2: { label: "已下单", cls: "bg-amber-100 text-amber-700" },
  3: { label: "已确认", cls: "bg-green-100 text-green-700" },
};

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const DOW_NAMES = ["一","二","三","四","五","六","日"];
const MONTH_ABBR: Record<string, string> = {
  jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
  jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
};

function parseToYMD(s: string): string | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;
  const dm = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (dm) {
    const m = MONTH_ABBR[dm[2].toLowerCase()];
    if (m) return `${dm[3]}-${m}-${dm[1].padStart(2,"0")}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

interface DayInfo { hasOrder: boolean; hasDelivery: boolean; suppliers: string[] }

function SushiCalendar({ orders }: { orders: SushiOrder[] }) {
  const now = new Date();
  const [cal, setCal] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [hovered, setHovered] = useState<string | null>(null);

  const dayMap = useMemo(() => {
    const map = new Map<string, DayInfo>();
    for (const o of orders) {
      const supplier = o.supplierName || "未知供应商";
      const add = (dateStr: string | null, field: "hasOrder" | "hasDelivery") => {
        if (!dateStr) return;
        const k = parseToYMD(dateStr);
        if (!k) return;
        const e = map.get(k) ?? { hasOrder: false, hasDelivery: false, suppliers: [] };
        e[field] = true;
        if (!e.suppliers.includes(supplier)) e.suppliers.push(supplier);
        map.set(k, e);
      };
      add(o.orderDate, "hasOrder");
      add(o.deliveryDate, "hasDelivery");
    }
    return map;
  }, [orders]);

  const cells = useMemo(() => {
    const first = new Date(cal.year, cal.month, 1);
    const daysInMonth = new Date(cal.year, cal.month + 1, 0).getDate();
    const startDow = (first.getDay() + 6) % 7;
    const result: Array<number | null> = Array(startDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [cal]);

  const todayKey = now.toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCal(c => { const d = new Date(c.year, c.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-slate-700 text-sm">{cal.year}年 {MONTH_NAMES[cal.month]}</span>
        <button
          onClick={() => setCal(c => { const d = new Date(c.year, c.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DOW_NAMES.map(d => (
          <div key={d} className="text-center text-xs text-slate-400 py-1 font-medium">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-10" />;
          const key = `${cal.year}-${String(cal.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const info = dayMap.get(key);
          const isToday = key === todayKey;
          return (
            <div
              key={i}
              className={`relative h-10 flex flex-col items-center justify-center rounded-lg transition-colors
                ${isToday ? "ring-2 ring-blue-400 ring-inset" : ""}
                ${info ? "bg-slate-50 hover:bg-slate-100" : "hover:bg-slate-50"}
              `}
              onMouseEnter={() => info && setHovered(key)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className={`text-xs leading-none ${isToday ? "font-bold text-blue-600" : "text-slate-600"}`}>
                {day}
              </span>
              {info && (
                <div className="flex gap-0.5 mt-0.5">
                  {info.hasOrder && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  {info.hasDelivery && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                </div>
              )}
              {hovered === key && info && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl pointer-events-none">
                  <div className="space-y-1">
                    {info.hasOrder && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <span>下单</span>
                      </div>
                    )}
                    {info.hasDelivery && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                        <span>配送</span>
                      </div>
                    )}
                    <div className="text-slate-300 pt-0.5 border-t border-slate-600">
                      {info.suppliers.slice(0, 3).join("、")}{info.suppliers.length > 3 ? " 等" : ""}
                    </div>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-5 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />下单日
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />配送日
        </div>
      </div>
    </div>
  );
}

export default function SushiPage() {
  const { username } = useSession();
  const isRoot = username === "root";
  const [orders, setOrders] = useState<SushiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<number | "all">("all");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/sushi/orders");
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/sushi/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setSyncMsg(`同步失败：${data.error}`);
      } else {
        setSyncMsg(`同步成功：${data.synced} 条订单已更新${data.errors?.length ? `，${data.errors.length} 条失败` : ""}`);
        load();
      }
    } catch {
      setSyncMsg("同步失败：网络错误");
    } finally {
      setSyncing(false);
    }
  }

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const lastSync = orders.length > 0 ? orders[0].syncedAt : null;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">寿司采购订单</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            同步自 St Pierre&apos;s OSS 系统
            {lastSync && ` · 上次同步 ${format(new Date(lastSync), "MM/dd HH:mm")}`}
          </p>
        </div>
        {isRoot && (
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "同步中..." : "立即同步"}
          </button>
        )}
      </div>

      {syncMsg && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${syncMsg.includes("失败") ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {syncMsg}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "本周订单", value: orders.length, color: "text-blue-600" },
          { label: "已下单", value: orders.filter(o => o.status >= 2).length, color: "text-amber-600" },
          { label: "已确认", value: orders.filter(o => o.status === 3).length, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <SushiCalendar orders={orders} />

      <div className="flex gap-2 mb-4">
        {([["all", "全部"], [1, "待下单"], [2, "已下单"], [3, "已确认"]] as [number | "all", string][]).map(([val, label]) => (
          <button key={String(val)} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === val ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <UtensilsCrossed size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">{orders.length === 0 ? "暂无数据，点击「立即同步」获取订单" : "没有匹配的订单"}</p>
          </div>
        ) : filtered.map(order => {
          const st = STATUS_MAP[order.status] ?? { label: "未知", cls: "bg-slate-100 text-slate-500" };
          return (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-800">{order.supplierName || "未知供应商"}</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    {order.poNumber && `PO# ${order.poNumber}`}
                    {order.orderDate && ` · 下单 ${order.orderDate}`}
                    {order.deliveryDate && ` · 预计送达 ${order.deliveryDate}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="text-sm text-slate-500">{order.items.length} 件商品</span>
                  <button onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    className="text-slate-400 hover:text-slate-600">
                    {expanded === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {expanded === order.id && (
                order.items.length === 0 ? (
                  <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 text-center text-sm text-slate-400">
                    <Package size={14} className="inline mr-1" />暂无商品明细
                  </div>
                ) : (
                  <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 text-xs border-b border-slate-200">
                          <th className="text-left pb-2 font-medium">代码</th>
                          <th className="text-left pb-2 font-medium">商品名称</th>
                          <th className="text-center pb-2 font-medium">数量</th>
                          <th className="text-left pb-2 font-medium">单位</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map(item => (
                          <tr key={item.id}>
                            <td className="py-2 text-slate-400 text-xs">{item.itemCode}</td>
                            <td className="py-2 text-slate-700">{item.itemName}</td>
                            <td className="py-2 text-center font-semibold text-slate-800">{item.quantity}</td>
                            <td className="py-2 text-slate-500">{item.uom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
