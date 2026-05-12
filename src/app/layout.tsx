import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tommy 商业管理系统",
  description: "库存、订单、客户、财务一体化管理",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
