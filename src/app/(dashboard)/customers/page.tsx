"use client";

import { useEffect, useState } from "react";
import { Plus, Users, MapPin, Phone, ExternalLink, Lock, Download } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import Link from "next/link";
import { format } from "date-fns";

interface Customer {
  address: string;
  name: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  _count: { orders: number };
}

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

export default function CustomersPage() {
  const { role } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ address: "", name: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  function handleExport() {
    const params = new URLSearchParams();
    if (exportStart) params.set("start", exportStart);
    if (exportEnd) params.set("end", exportEnd);
    window.location.href = `/api/export/customers?${params}`;
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/customers");
    setCustomers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "保存失败（地址可能已存在）");
      return;
    }
    setShowModal(false);
    load();
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search)
  );

  if (role !== "OWNER") {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Lock size={40} className="text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">无访问权限</p>
        <p className="text-slate-400 text-sm mt-1">客户信息仅限所有者查看</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">客户管理</h1>
          <p className="text-slate-500 text-sm mt-0.5">以收货地址为唯一标识，记录购买历史</p>
        </div>
        <button
          onClick={() => { setForm({ address: "", name: "", phone: "", notes: "" }); setError(""); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> 添加客户
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
        <Download size={14} className="text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-500">导出:</span>
        <input type="date" value={exportStart} onChange={(e) => setExportStart(e.target.value)}
          className="px-2 py-1 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <span className="text-slate-400 text-sm">至</span>
        <input type="date" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)}
          className="px-2 py-1 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition-colors">
          <Download size={13} /> 下载 CSV
        </button>
        {(exportStart || exportEnd) && (
          <button onClick={() => { setExportStart(""); setExportEnd(""); }}
            className="text-sm text-slate-400 hover:text-slate-600">清除</button>
        )}
        <span className="text-xs text-slate-400 ml-auto">不选日期则导出全部</span>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索姓名、地址或电话..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {loading ? (
          <div className="p-12 text-center text-slate-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">{search ? "未找到匹配的客户" : "暂无客户，点击右上角添加"}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((c) => (
              <div key={c.address} className="flex items-center justify-between px-4 md:px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      {c._count.orders} 笔订单
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><MapPin size={12} />{c.address}</span>
                    {c.phone && <span className="flex items-center gap-1"><Phone size={12} />{c.phone}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    加入于 {format(new Date(c.createdAt), "yyyy/MM/dd")}
                    {c.notes && ` · ${c.notes}`}
                  </p>
                </div>
                <Link
                  href={`/customer-orders?customerAddress=${encodeURIComponent(c.address)}`}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors ml-4"
                >
                  查看订单 <ExternalLink size={13} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="添加客户" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">收货地址（唯一标识） *</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
                placeholder="例：上海市浦东新区XXX路XXX号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">客户姓名 *</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="客户姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">电话</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="可选"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="可选"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm">取消</button>
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
