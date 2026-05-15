"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";

interface LogEntry {
  id: string;
  username: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

const ACTION_COLOR: Record<string, string> = {
  创建采购订单: "bg-blue-100 text-blue-700",
  删除采购订单: "bg-red-100 text-red-700",
  创建销售订单: "bg-emerald-100 text-emerald-700",
  删除销售订单: "bg-red-100 text-red-700",
  更新销售订单状态: "bg-amber-100 text-amber-700",
  创建客户: "bg-violet-100 text-violet-700",
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/activity-log?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setLogs(data.logs);
        setPages(data.pages);
        setTotal(data.total);
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 md:mb-8 flex items-center gap-3">
        <ClipboardList size={22} className="text-slate-400" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">操作日志</h1>
          <p className="text-slate-500 text-sm mt-0.5">共 {total} 条记录</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">暂无操作记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium">时间</th>
                  <th className="text-left px-4 py-3 font-medium">账户</th>
                  <th className="text-left px-4 py-3 font-medium">操作</th>
                  <th className="text-left px-4 py-3 font-medium">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {format(new Date(log.createdAt), "yyyy/MM/dd HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {log.username}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLOR[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{log.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-600">
            第 {page} / {pages} 页
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
