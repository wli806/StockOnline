"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, ClipboardList, ChevronDown, ChevronUp, Trash2, PackageSearch, Download } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput";
import { useSession } from "@/components/SessionProvider";
import { useCurrency } from "@/components/CurrencyProvider";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Suspense } from "react";

interface Product { id: string; name: string; standardPrice: number; unit: string; }
interface Customer { address: string; name: string; }
interface BatchOption {
  id: string;
  unitCost: number;
  quantity: number;
  purchaseOrder: { id: string; supplierOrderNo: string; arrivedAt: string | null; orderedAt: string };
}
interface OrderItem {
  id: string; productName: string; quantity: number;
  actualPrice: number; costPrice: number; profit: number;
}
interface CustomerOrder {
  id: string; customerAddress: string; status: string; orderDate: string;
  totalRevenue: number; totalProfit: number; notes: string | null;
  customer: Customer; items: OrderItem[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = { PENDING: "待处理", COMPLETED: "已完成", CANCELLED: "已取消" };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

interface FormItem {
  productId: string;
  productName: string;
  quantity: string;
  salesPrice: string;
  batchItemId: string;   // PurchaseOrderItem.id，空字符串=未选
  costPrice: string;     // 从批次带入，或手动填
}

function emptyItem(): FormItem {
  return { productId: "", productName: "", quantity: "1", salesPrice: "", batchItemId: "", costPrice: "" };
}

function calcProfit(item: FormItem): number {
  const qty = parseFloat(item.quantity) || 0;
  const sale = parseFloat(item.salesPrice) || 0;
  const cost = parseFloat(item.costPrice) || 0;
  return (sale - cost) * qty;
}

function CustomerOrdersContent() {
  const { role } = useSession();
  const isOwner = role === "OWNER";
  const canSeeFinancials = role === "OWNER" || role === "INVESTOR";
  const { fmt } = useCurrency();
  const searchParams = useSearchParams();
  const customerAddressFilter = searchParams.get("customerAddress") || "";

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggleExpanded(id: string) {
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  const [form, setForm] = useState({
    customerAddress: customerAddressFilter,
    notes: "",
    items: [emptyItem()] as FormItem[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  function handleExport() {
    const params = new URLSearchParams();
    if (exportStart) params.set("start", exportStart);
    if (exportEnd) params.set("end", exportEnd);
    window.location.href = `/api/export/customer-orders?${params}`;
  }

  // 批次数据缓存 { productId -> BatchOption[] }
  const [batchCache, setBatchCache] = useState<Record<string, BatchOption[]>>({});
  const [batchLoading, setBatchLoading] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const url = customerAddressFilter
      ? `/api/customer-orders?customerAddress=${encodeURIComponent(customerAddressFilter)}`
      : "/api/customer-orders";
    const [ordersRes, productsRes, customersRes] = await Promise.all([
      fetch(url), fetch("/api/products"), fetch("/api/customers"),
    ]);
    setOrders(await ordersRes.json());
    setProducts(await productsRes.json());
    setCustomers(await customersRes.json());
    setLoading(false);
  }, [customerAddressFilter]);

  useEffect(() => { load(); }, [load]);

  async function fetchBatches(productId: string) {
    if (batchCache[productId] !== undefined) return;
    setBatchLoading(prev => ({ ...prev, [productId]: true }));
    try {
      const res = await fetch(`/api/purchase-orders/batches?productId=${productId}`);
      const data: BatchOption[] = await res.json();
      setBatchCache(prev => ({ ...prev, [productId]: data }));
    } finally {
      setBatchLoading(prev => ({ ...prev, [productId]: false }));
    }
  }

  function updateItem(i: number, field: keyof FormItem, value: string) {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };

    if (field === "productId") {
      const p = products.find(p => p.id === value);
      items[i].productName = p?.name ?? "";
      items[i].salesPrice = "";
      items[i].batchItemId = "";
      // 默认进价先用商品的 standardPrice（进价）作为 fallback
      items[i].costPrice = p ? String(p.standardPrice) : "";
      if (value) fetchBatches(value);
    }

    if (field === "batchItemId") {
      const batches = batchCache[items[i].productId] ?? [];
      const batch = batches.find(b => b.id === value);
      if (batch) items[i].costPrice = String(batch.unitCost);
    }

    setForm({ ...form, items });
  }

  function addItem() { setForm({ ...form, items: [...form.items, emptyItem()] }); }
  function removeItem(i: number) { setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) }); }

  const totalRevenue = form.items.reduce((s, it) => s + (parseFloat(it.salesPrice) || 0) * (parseFloat(it.quantity) || 0), 0);
  const totalProfit = form.items.reduce((s, it) => s + calcProfit(it), 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/customer-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerAddress: form.customerAddress,
        notes: form.notes || null,
        items: form.items.map(item => ({
          productId: item.productId || null,
          productName: item.productName,
          quantity: item.quantity,
          standardPrice: item.costPrice || "0",
          actualPrice: item.salesPrice,
          costPrice: item.costPrice || "0",
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error || "保存失败"); return; }
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除此订单？")) return;
    await fetch(`/api/customer-orders/${id}`, { method: "DELETE" });
    load();
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/customer-orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  const filterTitle = customerAddressFilter
    ? `客户订单 · ${customers.find(c => c.address === customerAddressFilter)?.name || customerAddressFilter}`
    : "销售订单";

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">{filterTitle}</h1>
          <p className="text-slate-500 text-sm mt-0.5">选择采购批次自动带入进价，精确计算每单利润</p>
        </div>
        {isOwner && (
          <button
            onClick={() => {
              setForm({ customerAddress: customerAddressFilter, notes: "", items: [emptyItem()] });
              setError("");
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> 新建销售单
          </button>
        )}
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

      {/* 订单列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-400">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">暂无销售订单</p>
          </div>
        ) : orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between flex-wrap px-4 md:px-6 py-3 md:py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-slate-800">{order.customer.name}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
                <p className="text-slate-400 text-xs truncate">
                  {order.customer.address} · {format(new Date(order.orderDate), "yyyy/MM/dd HH:mm")}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                {canSeeFinancials && (
                  <div className="text-right text-sm">
                    <p className="text-slate-600">营收 <span className="font-semibold text-slate-800">{fmt(order.totalRevenue)}</span></p>
                    <p className="text-emerald-600 font-semibold">利润 {fmt(order.totalProfit)}</p>
                  </div>
                )}
                {(role === "OWNER" || role === "MANAGER") && (
                  <select
                    value={order.status}
                    onChange={e => handleStatusChange(order.id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none"
                  >
                    <option value="PENDING">待处理</option>
                    <option value="COMPLETED">已完成</option>
                    <option value="CANCELLED">已取消</option>
                  </select>
                )}
                {isOwner && (
                  <button onClick={() => handleDelete(order.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                    <Trash2 size={15} />
                  </button>
                )}
                <button onClick={() => toggleExpanded(order.id)} className="text-slate-400 hover:text-slate-600">
                  {expanded.has(order.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>
            {expanded.has(order.id) && (
              <div className="border-t border-slate-100 px-4 md:px-6 py-4 bg-slate-50/50">
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="text-slate-400 text-xs">
                      <th className="text-left pb-2 font-medium">商品</th>
                      <th className="text-right pb-2 font-medium">数量</th>
                      {canSeeFinancials && <th className="text-right pb-2 font-medium">进价</th>}
                      <th className="text-right pb-2 font-medium">销售价</th>
                      {canSeeFinancials && <th className="text-right pb-2 font-medium">净利润</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-2.5 text-slate-700">{item.productName}</td>
                        <td className="py-2.5 text-right text-slate-500">{item.quantity}</td>
                        {canSeeFinancials && <td className="py-2.5 text-right text-slate-400">{fmt(item.costPrice)}</td>}
                        <td className="py-2.5 text-right text-slate-700">{fmt(item.actualPrice)}</td>
                        {canSeeFinancials && (
                          <td className={`py-2.5 text-right font-medium ${item.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {fmt(item.profit)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {canSeeFinancials && (
                    <tfoot>
                      <tr className="border-t border-slate-200 text-sm font-semibold">
                        <td colSpan={4} className="pt-2.5 text-slate-600">合计</td>
                        <td className={`pt-2.5 text-right ${order.totalProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {fmt(order.totalProfit)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                </div>
                {order.notes && <p className="mt-3 text-sm text-slate-500">备注：{order.notes}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 新建销售单弹窗 */}
      {isOwner && showModal && (
        <Modal title="新建销售单" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {/* 客户 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">客户 *</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.customerAddress}
                onChange={e => setForm({ ...form, customerAddress: e.target.value })}
                required
              >
                <option value="">-- 选择客户 --</option>
                {customers.map(c => (
                  <option key={c.address} value={c.address}>{c.name} · {c.address}</option>
                ))}
              </select>
            </div>

            {/* 商品明细 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">商品明细 *</label>
                <button type="button" onClick={addItem} className="text-blue-600 text-xs hover:underline">+ 添加行</button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, i) => {
                  const batches = batchCache[item.productId] ?? [];
                  const isLoadingBatches = batchLoading[item.productId];
                  const profit = calcProfit(item);
                  const hasSalePrice = !!item.salesPrice;
                  const hasCost = !!item.costPrice;

                  return (
                    <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2.5 bg-slate-50/30">
                      {/* 行1：商品 + 数量 + 销售价 + 删除 */}
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-6">
                          <p className="text-xs text-slate-400 mb-1">商品</p>
                          <select
                            className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={item.productId}
                            onChange={e => updateItem(i, "productId", e.target.value)}
                          >
                            <option value="">自定义商品</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          {!item.productId && (
                            <input
                              className="w-full mt-1 px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              placeholder="输入商品名称"
                              value={item.productName}
                              onChange={e => updateItem(i, "productName", e.target.value)}
                              required={!item.productId}
                            />
                          )}
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-slate-400 mb-1">数量</p>
                          <input
                            type="number" min="1"
                            className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={item.quantity}
                            onChange={e => updateItem(i, "quantity", e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-span-3">
                          <p className="text-xs text-slate-400 mb-1">销售价</p>
                          <CurrencyInput
                            audValue={item.salesPrice}
                            onChangeAUD={v => updateItem(i, "salesPrice", v)}
                            placeholder="售价"
                            required
                          />
                        </div>
                        <div className="col-span-1 text-center pb-1">
                          {form.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(i)}
                              className="text-red-400 hover:text-red-600 text-xl leading-none">
                              &times;
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 行2：采购批次 + 进价 + 利润预览 */}
                      {item.productId && (
                        <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-slate-200">
                          <div className="col-span-6">
                            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                              <PackageSearch size={11} /> 采购批次
                            </p>
                            {isLoadingBatches ? (
                              <p className="text-xs text-slate-400 py-1">加载批次中...</p>
                            ) : batches.length === 0 ? (
                              <p className="text-xs text-amber-600 py-1">暂无到货批次，请先在采购订单中确认到货</p>
                            ) : (
                              <select
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={item.batchItemId}
                                onChange={e => updateItem(i, "batchItemId", e.target.value)}
                              >
                                <option value="">-- 选择批次 --</option>
                                {batches.map(b => (
                                  <option key={b.id} value={b.id}>
                                    {b.purchaseOrder.supplierOrderNo} · ${b.unitCost}/件 ·{" "}
                                    {b.purchaseOrder.arrivedAt
                                      ? format(new Date(b.purchaseOrder.arrivedAt), "yy/MM/dd 入库")
                                      : format(new Date(b.purchaseOrder.orderedAt), "yy/MM/dd")}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="col-span-3">
                            <p className="text-xs text-slate-400 mb-1">进价</p>
                            <CurrencyInput
                              key={`cost-${i}-${item.batchItemId}`}
                              audValue={item.costPrice}
                              onChangeAUD={v => updateItem(i, "costPrice", v)}
                              placeholder="进价"
                            />
                          </div>
                          <div className="col-span-3 text-right">
                            <p className="text-xs text-slate-400 mb-1">本行利润</p>
                            {hasSalePrice && hasCost ? (
                              <p className={`text-sm font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                ${profit.toFixed(2)}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-300">—</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 自定义商品时也显示进价和利润行 */}
                      {!item.productId && item.productName && (
                        <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-slate-200">
                          <div className="col-span-6">
                            <p className="text-xs text-slate-400 mb-1">进价（手动填写）</p>
                            <CurrencyInput
                              audValue={item.costPrice}
                              onChangeAUD={v => updateItem(i, "costPrice", v)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-6 text-right pt-4">
                            {hasSalePrice && hasCost ? (
                              <p className={`text-sm font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                利润 ${profit.toFixed(2)}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-300">填写进价后显示利润</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 合计预览 */}
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex justify-between text-sm">
                <span className="text-slate-500">预计营收：<span className="font-semibold text-slate-800">{fmt(totalRevenue)}</span></span>
                <span className="text-slate-500">预计利润：
                  <span className={`font-bold ml-1 ${totalProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {fmt(totalProfit)}
                  </span>
                </span>
              </div>
            </div>

            {/* 备注 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="可选"
              />
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
                取消
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                {saving ? "提交中..." : "提交订单"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function CustomerOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">加载中...</div>}>
      <CustomerOrdersContent />
    </Suspense>
  );
}
