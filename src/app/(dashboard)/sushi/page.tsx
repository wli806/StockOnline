"use client";

import { useEffect, useState } from "react";
import { RefreshCw, UtensilsCrossed, ChevronDown, ChevronUp, Package } from "lucide-react";
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

export default function SushiPage() {
  const { role } = useSession();
  const isOwner = role === "OWNER";
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
        {isOwner && (
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
