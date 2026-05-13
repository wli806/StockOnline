"use client";

import { useEffect, useState } from "react";
import { Warehouse, Pencil, AlertTriangle } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useCurrency } from "@/components/CurrencyProvider";

interface InventoryItem {
  id: string;
  quantity: number;
  updatedAt: string;
  product: { id: string; name: string; type: string; unit: string; standardPrice: number };
}

const TYPE_LABEL: Record<string, string> = { wine: "酒", pokemon: "宝可梦卡片", other: "其他" };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { role } = useSession();
  const isOwner = role === "OWNER";
  const { fmt } = useCurrency();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [newQty, setNewQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/inventory");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: editItem.product.id, quantity: newQty }),
    });
    setSaving(false);
    setEditItem(null);
    load();
  }

  const filtered = items.filter((item) => {
    if (filter === "low") return item.quantity <= 5;
    if (filter === "wine") return item.product.type === "wine";
    if (filter === "pokemon") return item.product.type === "pokemon";
    return true;
  });

  const lowCount = items.filter((i) => i.quantity <= 5).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">库存管理</h1>
          <p className="text-slate-500 text-sm mt-0.5">当前库存数量，采购到货后自动更新</p>
        </div>
        {lowCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm">
            <AlertTriangle size={15} />
            <span>{lowCount} 种商品库存不足（≤5）</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {[["all", "全部"], ["low", "库存不足"], ["wine", "酒"], ["pokemon", "宝可梦卡片"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === val ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {loading ? (
          <div className="p-12 text-center text-slate-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Warehouse size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">暂无库存记录</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs">
                <th className="text-left px-6 py-3 font-medium">商品</th>
                <th className="text-left px-4 py-3 font-medium">类别</th>
                <th className="text-right px-4 py-3 font-medium">当前库存</th>
                <th className="text-right px-4 py-3 font-medium">标准价</th>
                <th className="text-right px-4 py-3 font-medium">库存价值</th>
                {isOwner && <th className="text-center px-4 py-3 font-medium">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((item) => {
                const isLow = item.quantity <= 5;
                return (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isLow ? "bg-red-50/50" : ""}`}>
                    <td className="px-6 py-3.5 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />}
                        {item.product.name}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{TYPE_LABEL[item.product.type] || item.product.type}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-bold text-base ${isLow ? "text-red-500" : "text-slate-700"}`}>
                        {item.quantity}
                      </span>
                      <span className="text-slate-400 ml-1">{item.product.unit}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-600">{fmt(item.product.standardPrice)}</td>
                    <td className="px-4 py-3.5 text-right text-slate-600">
                      {fmt(item.quantity * item.product.standardPrice)}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => { setEditItem(item); setNewQty(String(item.quantity)); }}
                          className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editItem && (
        <Modal title={`调整库存 - ${editItem.product.name}`} onClose={() => setEditItem(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">当前库存</p>
              <p className="text-2xl font-bold text-slate-800">{editItem.quantity} {editItem.product.unit}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">调整为</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditItem(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm">取消</button>
              <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
