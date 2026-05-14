"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrency } from "@/components/CurrencyProvider";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Truck,
  Users,
  ClipboardList,
  DollarSign,
  BarChart2,
  Settings,
  LogOut,
  UtensilsCrossed,
} from "lucide-react";

const navItems = [
  { href: "/", label: "总览", icon: LayoutDashboard },
  { href: "/products", label: "商品管理", icon: Package, ownerOnly: true },
  { href: "/inventory", label: "库存", icon: Warehouse },
  { href: "/purchase-orders", label: "采购订单", icon: ShoppingCart },
  { href: "/suppliers", label: "供应商", icon: Truck, ownerOnly: true },
  { href: "/customers", label: "客户", icon: Users, ownerOnly: true },
  { href: "/customer-orders", label: "销售订单", icon: ClipboardList },
  { href: "/sushi", label: "寿司采购", icon: UtensilsCrossed },
  { href: "/finance", label: "财务流水", icon: DollarSign, investorOrOwnerOnly: true },
  { href: "/reports", label: "利润报表", icon: BarChart2, investorOrOwnerOnly: true },
  { href: "/settings", label: "用户管理", icon: Settings, ownerOnly: true },
];

interface SidebarProps {
  role: string;
  username: string;
}

export default function Sidebar({ role, username }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currency, toggle } = useCurrency();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const visibleItems = navItems.filter((item) => {
    if (item.ownerOnly) return role === "OWNER";
    if (item.investorOrOwnerOnly) return role === "OWNER" || role === "INVESTOR";
    return true;
  });

  return (
    <aside className="w-[220px] min-h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-50">
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-lg shadow">
            T
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">库存管理系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pt-3 pb-1 border-t border-slate-700">
        <p className="text-xs text-slate-500 px-1 mb-1.5">货币</p>
        <div className="flex bg-slate-800 rounded-lg p-0.5">
          {(["AUD", "CNY"] as const).map((c) => (
            <button
              key={c}
              onClick={() => c !== currency && toggle()}
              className={`flex-1 py-1 text-xs rounded-md transition-colors font-medium ${currency === c ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {c === "AUD" ? "$ AUD" : "¥ CNY"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-4 border-slate-700">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-slate-400">登录账户</p>
          <p className="text-sm font-medium text-white">{username}</p>
          <p className="text-xs text-blue-400 mt-0.5">
            {role === "OWNER" ? "所有者" : role === "INVESTOR" ? "投资者" : "查看者"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white text-sm transition-colors"
        >
          <LogOut size={17} />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}
