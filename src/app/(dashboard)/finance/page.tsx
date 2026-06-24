"use client";

import { useEffect, useState } from "react";
import { Plus, DollarSign, TrendingUp, TrendingDown, Trash2, Lock } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useCurrency } from "@/components/CurrencyProvider";
import CurrencyInput from "@/components/CurrencyInput";
import { format } from "date-fns";

interface FinancialRecord {
  id: string; type: string; amount: number; description: string;
  category: string | null; date: string; createdAt: string;
  source?: "manual" | "purchase" | "sale";
  profit?: number;
}

const CATEGORIES = ["采购成本", "运费", "平台费用", "营业收入", "退款", "杂费", "其他"];

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

export default function FinancePage() {
  const { role } = useSession();
  const isOwner = role === "OWNER" || role === "MANAGER";
  const { fmt } = useCurrency();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: "EXPENSE", amount: "", description: "", category: "", date: format(new Date(), "yyyy-MM-dd") });
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function load() {
    setLoading(true);
    try {
      let url = "/api/finance";
      if (startDate && endDate) url += `?start=${startDate}&end=${endDate}T23:59:59`;
      const res = await fetch(url);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [startDate, endDate]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除此记录？")) return;
    await fetch("/api/finance", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const totalIncome = records.filter((r) => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
  const totalExpense = records.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);
  const salesProfit = records.filter((r) => r.source === "sale").reduce((s, r) => s + (r.profit ?? 0), 0);
  const manualIncome = records.filter((r) => r.source === "manual" && r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
  const manualExpense = records.filter((r) => r.source === "manual" && r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);
  const netProfit = salesProfit + manualIncome - manualExpense;

  if (role !== "OWNER" && role !== "MANAGER" && role !== "INVESTOR") {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Lock size={40} className="text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">无访问权限</p>
        <p className="text-slate-400 text-sm mt-1">财务数据仅限所有者和投资者查看</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">财务流水</h1>
          <p className="text-slate-500 text-sm mt-0.5">记录所有收支明细，追踪资金流动</p>
        </div>
        {isOwner && (
          <button onClick={() => { setForm({ type: "EXPENSE", amount: "", description: "", category: "", date: format(new Date(), "yyyy-MM-dd") }); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> 新增记录
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "总收入", value: totalIncome, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "总支出", value: totalExpense, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 border-red-200" },
          { label: "净利润", value: netProfit, icon: DollarSign, color: netProfit >= 0 ? "text-blue-600" : "text-red-500", bg: "bg-blue-50 border-blue-200" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <span className="text-sm text-slate-600">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <span className="text-sm text-slate-500">筛选日期:</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        <span className="text-slate-400">至</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(""); setEndDate(""); }} className="text-sm text-slate-400 hover:text-slate-600">清除</button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {loading ? (
          <div className="p-12 text-center text-slate-400">加载中...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">暂无财务记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs">
                <th className="text-left px-6 py-3 font-medium">日期</th>
                <th className="text-left px-4 py-3 font-medium">类型</th>
                <th className="text-left px-4 py-3 font-medium">描述</th>
                <th className="text-left px-4 py-3 font-medium">类别</th>
                <th className="text-left px-4 py-3 font-medium">来源</th>
                <th className="text-right px-4 py-3 font-medium">金额</th>
                {isOwner && <th className="text-center px-4 py-3 font-medium">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-500">{format(new Date(r.date), "yyyy/MM/dd")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${r.type === "INCOME" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {r.type === "INCOME" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {r.type === "INCOME" ? "收入" : "支出"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{r.description}</td>
                  <td className="px-4 py-3 text-slate-500">{r.category || "-"}</td>
                  <td className="px-4 py-3">
                    {r.source === "purchase" ? (
                      <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">采购订单</span>
                    ) : r.source === "sale" ? (
                      <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">销售订单</span>
                    ) : (
                      <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">手动</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${r.type === "INCOME" ? "text-emerald-600" : "text-red-500"}`}>
                    {r.type === "INCOME" ? "+" : "-"}{fmt(r.amount)}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-center">
                      {(!r.source || r.source === "manual") ? (
                        <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">自动</span>
                      )}
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
        <Modal title="新增财务记录" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex gap-3">
              {["EXPENSE", "INCOME"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.type === t
                    ? t === "INCOME" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {t === "INCOME" ? "收入" : "支出"}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">金额 *</label>
              <CurrencyInput
                audValue={form.amount}
                onChangeAUD={(v) => setForm({ ...form, amount: v })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">描述 *</label>
              <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="例：购买茅台 50瓶" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">类别</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">-- 选择类别 --</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
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
