"use client";

import { useEffect, useState } from "react";
import { Package, Warehouse, ShoppingCart, Users, TrendingUp, AlertTriangle, ClipboardList } from "lucide-react";
import { useCurrency } from "@/components/CurrencyProvider";
import { format } from "date-fns";

interface DashboardData {
  totalProducts: number;
  lowStockCount: number;
  pendingPurchaseOrders: number;
  monthRevenue: number;
  monthProfit: number;
  monthOrderCount: number;
  totalCustomers: number;
  recentOrders: Array<{
    id: string;
    orderDate: string;
    totalRevenue: number;
    totalProfit: number;
    status: string;
    customer: { name: string; address: string };
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待处理",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function DashboardPage() {
  const { fmt } = useCurrency();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  const cards = [
    { label: "本月营收", value: fmt(data.monthRevenue), icon: TrendingUp, color: "bg-blue-600", sub: `${data.monthOrderCount} 笔订单` },
    { label: "本月利润", value: fmt(data.monthProfit), icon: TrendingUp, color: "bg-emerald-600", sub: `利润率 ${data.monthRevenue > 0 ? ((data.monthProfit / data.monthRevenue) * 100).toFixed(1) : 0}%` },
    { label: "商品种类", value: data.totalProducts, icon: Package, color: "bg-violet-600", sub: `${data.lowStockCount} 种库存不足` },
    { label: "客户总数", value: data.totalCustomers, icon: Users, color: "bg-orange-500", sub: "以地址为标识" },
    { label: "待到货采购", value: data.pendingPurchaseOrders, icon: ShoppingCart, color: "bg-red-500", sub: "等待确认入库" },
    { label: "库存预警", value: data.lowStockCount, icon: AlertTriangle, color: "bg-amber-500", sub: "库存 ≤ 5 件" },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">业务总览</h1>
        <p className="text-slate-500 text-sm mt-1">{format(new Date(), "yyyy年M月d日")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 mb-5 md:mb-8">
        {cards.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 md:p-5 flex items-start gap-3">
            <div className={`${color} w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow`}>
              <Icon size={17} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 text-xs mb-0.5 truncate">{label}</p>
              <p className="text-lg md:text-2xl font-bold text-slate-800 leading-tight">{value}</p>
              <p className="text-slate-400 text-xs mt-0.5 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={18} className="text-slate-400" />
          <h2 className="font-semibold text-slate-700">最近销售订单</h2>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="text-slate-400 text-sm py-6 text-center">暂无订单</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs">
                  <th className="text-left pb-2 font-medium">日期</th>
                  <th className="text-left pb-2 font-medium">客户</th>
                  <th className="text-right pb-2 font-medium">营收</th>
                  <th className="text-right pb-2 font-medium">利润</th>
                  <th className="text-center pb-2 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-2.5 text-slate-600 whitespace-nowrap">{format(new Date(order.orderDate), "MM/dd HH:mm")}</td>
                    <td className="py-2.5 text-slate-700 font-medium">{order.customer.name}</td>
                    <td className="py-2.5 text-right text-slate-700 whitespace-nowrap">{fmt(order.totalRevenue)}</td>
                    <td className="py-2.5 text-right text-emerald-600 font-medium whitespace-nowrap">{fmt(order.totalProfit)}</td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
