"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Truck, Lock, Download } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { format } from "date-fns";

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  notes: string | null;
  createdAt: string;
}

const emptyForm = { name: "", contact: "", notes: "" };

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

export default function SuppliersPage() {
  const { role } = useSession();
  const isOwner = role === "OWNER";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  function handleExport() {
    const params = new URLSearchParams();
    if (exportStart) params.set("start", exportStart);
    if (exportEnd) params.set("end", exportEnd);
    window.location.href = `/api/export/suppliers?${params}`;
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/suppliers");
    setSuppliers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, contact: s.contact || "", notes: s.notes || "" });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers";
    const method = editing ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确认删除供应商「${name}」？`)) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    load();
  }

  if (!isOwner) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Lock size={40} className="text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">无访问权限</p>
        <p className="text-slate-400 text-sm mt-1">供应商管理仅限所有者查看</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">供应商管理</h1>
          <p className="text-slate-500 text-sm mt-0.5">管理上游供应商信息，新建采购单时可直接选择</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> 添加供应商
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {loading ? (
          <div className="p-12 text-center text-slate-400">加载中...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Truck size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">暂无供应商，点击右上角添加</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs">
                <th className="text-left px-6 py-3 font-medium">供应商名称</th>
                <th className="text-left px-4 py-3 font-medium">联系人</th>
                <th className="text-left px-4 py-3 font-medium">备注</th>
                <th className="text-left px-4 py-3 font-medium">添加时间</th>
                <th className="text-center px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3.5 text-slate-500">{s.contact || "-"}</td>
                  <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">{s.notes || "-"}</td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">{format(new Date(s.createdAt), "yyyy/MM/dd")}</td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(s.id, s.name)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "编辑供应商" : "添加供应商"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">供应商名称 *</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="例：茅台集团经销商"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">联系人</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="可选"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="可选，例：主供茅台/五粮液系列"
              />
            </div>
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
