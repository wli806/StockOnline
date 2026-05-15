"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Package, Lock } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import CurrencyInput from "@/components/CurrencyInput";

interface Product {
  id: string;
  name: string;
  type: string;
  standardPrice: number;
  unit: string;
  description: string | null;
  inventoryItem: { quantity: number } | null;
}

const TYPE_LABEL: Record<string, string> = { wine: "酒", pokemon: "宝可梦卡片", other: "其他" };
const TYPE_COLOR: Record<string, string> = {
  wine: "bg-purple-100 text-purple-700",
  pokemon: "bg-yellow-100 text-yellow-700",
  other: "bg-gray-100 text-gray-600",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { role } = useSession();
  const isOwner = role === "OWNER" || role === "MANAGER";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", type: "wine", standardPrice: "", unit: "瓶", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", type: "wine", standardPrice: "", unit: "瓶", description: "" });
    setError("");
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, type: p.type, standardPrice: String(p.standardPrice), unit: p.unit, description: p.description || "" });
    setError("");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "保存失败");
        return;
      }
      setShowModal(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确认删除商品「${name}」？`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  }

  if (role !== "OWNER" && role !== "MANAGER") {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Lock size={40} className="text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">无访问权限</p>
        <p className="text-slate-400 text-sm mt-1">商品管理仅限所有者和管理员查看</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">商品管理</h1>
          <p className="text-slate-500 text-sm mt-0.5">管理商品信息及进价（成本），作为利润计算的参考基准</p>
        </div>
        {isOwner && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> 添加商品
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {loading ? (
          <div className="p-12 text-center text-slate-400">加载中...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">暂无商品，点击右上角添加</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs">
                <th className="text-left px-6 py-3 font-medium">商品名称</th>
                <th className="text-left px-4 py-3 font-medium">类别</th>
                <th className="text-center px-4 py-3 font-medium">单位</th>
                <th className="text-right px-4 py-3 font-medium">当前库存</th>
                {isOwner && <th className="text-center px-4 py-3 font-medium">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[p.type] || TYPE_COLOR.other}`}>
                      {TYPE_LABEL[p.type] || p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-500">{p.unit}</td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`font-semibold ${(p.inventoryItem?.quantity ?? 0) <= 5 ? "text-red-500" : "text-slate-700"}`}>
                      {p.inventoryItem?.quantity ?? 0}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(p)} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(p.id, p.name)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {isOwner && showModal && (
        <Modal title={editing ? "编辑商品" : "添加商品"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">商品名称 *</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="例：茅台飞天 500ml"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">类别 *</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="wine">酒</option>
                  <option value="pokemon">宝可梦卡片</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">单位</label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="瓶/包/张"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">参考进价 *</label>
              <CurrencyInput
                audValue={form.standardPrice}
                onChangeAUD={(v) => setForm({ ...form, standardPrice: v })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="可选"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
                取消
              </button>
              <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
