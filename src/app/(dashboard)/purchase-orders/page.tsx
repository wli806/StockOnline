"use client";

import { useEffect, useState } from "react";
import { Plus, CheckCircle, ShoppingCart, ChevronDown, ChevronUp, Download, Trash2 } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput";
import { useSession } from "@/components/SessionProvider";
import { useCurrency } from "@/components/CurrencyProvider";
import { format } from "date-fns";

interface Product { id: string; name: string; unit: string; standardPrice: number; }
interface Supplier { id: string; name: string; }
interface OrderItem { id: string; productName: string; quantity: number; unitCost: number; product: Product | null; }
interface PurchaseOrder {
  id: string; supplierOrderNo: string; status: string; orderedAt: string; arrivedAt: string | null;
  notes: string | null; shippingFee: number; supplier: Supplier | null; items: OrderItem[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ARRIVED: "bg-green-100 text-green-700",
};
const STATUS_LABEL: Record<string, string> = { PENDING: "等待到货", ARRIVED: "已到货" };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const { role } = useSession();
  const isOwner = role === "OWNER" || role === "MANAGER";
  const canSeeFinancials = role === "OWNER" || role === "MANAGER" || role === "INVESTOR";
  const { fmt } = useCurrency();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggleExpanded(id: string) {
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  const [confirming, setConfirming] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  function handleExport() {
    const params = new URLSearchParams();
    if (exportStart) params.set("start", exportStart);
    if (exportEnd) params.set("end", exportEnd);
    window.location.href = `/api/export/purchase-orders?${params}`;
  }

  const [form, setForm] = useState({
    supplierOrderNo: "", supplierId: "", notes: "", shippingFee: "0",
    items: [{ productId: "", productName: "", quantity: "1", unitCost: "" }],
  });

  async function load() {
    setLoading(true);
    const [ordersRes, productsRes, suppliersRes] = await Promise.all([
      fetch("/api/purchase-orders"),
      fetch("/api/products"),
      fetch("/api/suppliers"),
    ]);
    setOrders(await ordersRes.json());
    setProducts(await productsRes.json());
    setSuppliers(await suppliersRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function addItem() {
    setForm({ ...form, items: [...form.items, { productId: "", productName: "", quantity: "1", unitCost: "" }] });
  }

  function removeItem(i: number) {
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  }

  function updateItem(i: number, field: string, value: string) {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === "productId") {
      const p = products.find((p) => p.id === value);
      if (p) items[i].productName = p.name;
    }
    setForm({ ...form, items });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierOrderNo: form.supplierOrderNo,
        supplierId: form.supplierId || null,
        notes: form.notes || null,
        shippingFee: parseFloat(form.shippingFee) || 0,
        items: form.items.map((item) => ({
          productId: item.productId,
          productName: item.productName || products.find((p) => p.id === item.productId)?.name || item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      }),
    });
    setSaving(false);
    if (res.ok) { setShowModal(false); load(); }
  }

  async function handleConfirm(id: string) {
    if (!confirm("确认订单已到货？到货后库存将自动增加，此操作不可逆。")) return;
    setConfirming(id);
    await fetch(`/api/purchase-orders/${id}/confirm`, { method: "POST" });
    setConfirming(null);
    load();
  }

  async function handleDelete(order: PurchaseOrder) {
    const warning = order.status === "ARRIVED" ? "⚠️ 该订单已到货，删除后库存数据不会回滚。\n\n" : "";
    if (!confirm(`${warning}确认删除采购单「${order.supplierOrderNo}」？`)) return;
    await fetch(`/api/purchase-orders/${order.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">采购订单</h1>
          <p className="text-slate-500 text-sm mt-0.5">记录上游发货单，确认到货后自动入库</p>
        </div>
        {isOwner && (
          <button onClick={() => { setForm({ supplierOrderNo: "", supplierId: "", notes: "", shippingFee: "0", items: [{ productId: "", productName: "", quantity: "1", unitCost: "" }] }); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> 新建采购单
          </button>
        )}
      </div>

      {canSeeFinancials && (
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
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-400">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <ShoppingCart size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">暂无采购订单</p>
          </div>
        ) : orders.map((order) => {
          const itemsTotal = order.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
          const grandTotal = itemsTotal + (order.shippingFee ?? 0);
          return (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{order.supplierOrderNo}</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      {order.supplier ? order.supplier.name : "未指定供应商"} · 下单 {format(new Date(order.orderedAt), "yyyy/MM/dd HH:mm")}
                      {order.arrivedAt && ` · 到货 ${format(new Date(order.arrivedAt), "yyyy/MM/dd")}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right text-sm mr-2">
                    <p className="text-slate-500">{order.items.length} 件商品</p>
                    {canSeeFinancials && (
                      <p className="font-semibold text-slate-700">{fmt(grandTotal)}</p>
                    )}
                  </div>
                  {isOwner && order.status === "PENDING" && (
                    <button
                      onClick={() => handleConfirm(order.id)}
                      disabled={confirming === order.id}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                    >
                      <CheckCircle size={14} />
                      {confirming === order.id ? "处理中..." : "确认到货"}
                    </button>
                  )}
                  {isOwner && (
                    <button onClick={() => handleDelete(order)} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button onClick={() => toggleExpanded(order.id)} className="text-slate-400 hover:text-slate-600">
                    {expanded.has(order.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>
              {expanded.has(order.id) && (
                <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs">
                        <th className="text-left pb-2 font-medium">商品</th>
                        <th className="text-right pb-2 font-medium">数量</th>
                        {canSeeFinancials && <th className="text-right pb-2 font-medium">进价/件</th>}
                        {canSeeFinancials && <th className="text-right pb-2 font-medium">小计</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 text-slate-700">{item.productName}</td>
                          <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                          {canSeeFinancials && <td className="py-2 text-right text-slate-600">{fmt(item.unitCost)}</td>}
                          {canSeeFinancials && <td className="py-2 text-right font-medium text-slate-700">{fmt(item.quantity * item.unitCost)}</td>}
                        </tr>
                      ))}
                    </tbody>
                    {canSeeFinancials && (
                      <tfoot className="border-t border-slate-200">
                        {(order.shippingFee ?? 0) > 0 && (
                          <tr>
                            <td colSpan={2} className="pt-2 text-right text-xs text-slate-400">商品小计</td>
                            <td />
                            <td className="pt-2 text-right text-slate-600">{fmt(itemsTotal)}</td>
                          </tr>
                        )}
                        {(order.shippingFee ?? 0) > 0 && (
                          <tr>
                            <td colSpan={2} className="py-1 text-right text-xs text-slate-400">运费</td>
                            <td />
                            <td className="py-1 text-right text-slate-600">{fmt(order.shippingFee)}</td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={2} className="pt-1 text-right text-xs font-medium text-slate-600">合计</td>
                          <td />
                          <td className="pt-1 text-right font-bold text-slate-800">{fmt(grandTotal)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {order.notes && <p className="mt-3 text-sm text-slate-500">备注：{order.notes}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isOwner && showModal && (
        <Modal title="新建采购单" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">上游订单号 *</label>
                <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.supplierOrderNo} onChange={(e) => setForm({ ...form, supplierOrderNo: e.target.value })} required placeholder="供应商给的订单编号" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">供应商</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">-- 不指定 --</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">采购商品 *</label>
                <button type="button" onClick={addItem} className="text-blue-600 text-xs hover:underline">+ 添加行</button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.productId} onChange={(e) => updateItem(i, "productId", e.target.value)} required>
                        <option value="">选择商品</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="1" placeholder="数量" className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} required />
                    </div>
                    <div className="col-span-4">
                      <CurrencyInput
                        audValue={item.unitCost}
                        onChangeAUD={(v) => updateItem(i, "unitCost", v)}
                        placeholder="进价"
                        required
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">运费</label>
                <CurrencyInput
                  audValue={form.shippingFee}
                  onChangeAUD={(v) => setForm({ ...form, shippingFee: v })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="可选" />
              </div>
            </div>

            {(() => {
              const itemsAud = form.items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unitCost) || 0), 0);
              const shipAud = parseFloat(form.shippingFee) || 0;
              const totalAud = itemsAud + shipAud;
              if (totalAud === 0) return null;
              return (
                <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm space-y-1 border border-slate-200">
                  <div className="flex justify-between text-slate-500">
                    <span>商品小计</span><span>{fmt(itemsAud)}</span>
                  </div>
                  {shipAud > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>运费（已按汇率换算为澳币）</span><span>{fmt(shipAud)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-slate-800 pt-1 border-t border-slate-200">
                    <span>合计</span><span>{fmt(totalAud)}</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm">取消</button>
              <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                {saving ? "提交中..." : "提交采购单"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
