"use client";

import { useEffect, useState } from "react";
import { BarChart2, TrendingUp, Lock } from "lucide-react";
import { useSession } from "@/components/SessionProvider";

interface ReportRow {
  label: string;
  revenue: number;
  profit: number;
  income: number;
  expense: number;
  net: number;
}

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export default function ReportsPage() {
  const { role } = useSession();
  const now = new Date();
  const [viewType, setViewType] = useState<"month" | "week">("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?type=${viewType}&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [viewType, year, month]);

  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = data.reduce((s, r) => s + r.profit, 0);
  const totalExpense = data.reduce((s, r) => s + r.expense, 0);
  const totalNet = data.reduce((s, r) => s + r.net, 0);

  const maxNet = Math.max(...data.map((r) => Math.abs(r.net)), 1);

  if (role !== "OWNER" && role !== "INVESTOR") {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Lock size={40} className="text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">无访问权限</p>
        <p className="text-slate-400 text-sm mt-1">财务数据仅限所有者和投资者查看</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">利润报表</h1>
          <p className="text-slate-500 text-sm mt-0.5">按周或按月汇总营收、利润与净收益</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={() => setViewType("month")} className={`px-3 py-1 rounded-md text-sm transition-colors ${viewType === "month" ? "bg-white shadow text-slate-800 font-medium" : "text-slate-500"}`}>
              按月
            </button>
            <button onClick={() => setViewType("week")} className={`px-3 py-1 rounded-md text-sm transition-colors ${viewType === "week" ? "bg-white shadow text-slate-800 font-medium" : "text-slate-500"}`}>
              按周
            </button>
          </div>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>
          {viewType === "week" && (
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "总营收", value: totalRevenue, color: "text-blue-600" },
          { label: "销售利润", value: totalProfit, color: "text-emerald-600" },
          { label: "其他支出", value: totalExpense, color: "text-red-500" },
          { label: "净利润", value: totalNet, color: totalNet >= 0 ? "text-emerald-700" : "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>${value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center text-slate-400">加载中...</div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <BarChart2 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400">暂无数据</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-600">净利润趋势</span>
            </div>
            <div className="flex items-end gap-2 h-40">
              {data.map((row) => {
                const barH = Math.max(4, (Math.abs(row.net) / maxNet) * 100);
                return (
                  <div key={row.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-xs font-semibold ${row.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {row.net >= 0 ? "+" : ""}${row.net.toFixed(0)}
                    </span>
                    <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
                      <div
                        className={`w-full rounded-t-md transition-all ${row.net >= 0 ? "bg-emerald-500" : "bg-red-400"}`}
                        style={{ height: `${barH}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 text-center leading-tight">{row.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs">
                  <th className="text-left px-6 py-3 font-medium">周期</th>
                  <th className="text-right px-4 py-3 font-medium">营收</th>
                  <th className="text-right px-4 py-3 font-medium">销售利润</th>
                  <th className="text-right px-4 py-3 font-medium">其他收入</th>
                  <th className="text-right px-4 py-3 font-medium">支出</th>
                  <th className="text-right px-6 py-3 font-medium">净利润</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700">{row.label}</td>
                    <td className="px-4 py-3 text-right text-slate-600">${row.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">${row.profit.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-blue-500">${row.income.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-red-400">${row.expense.toFixed(2)}</td>
                    <td className={`px-6 py-3 text-right font-bold ${row.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {row.net >= 0 ? "+" : ""}${row.net.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
