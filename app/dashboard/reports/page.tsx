import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, ShoppingCart, FileText, DollarSign } from "lucide-react";

export default async function ReportsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [totalRequests, approvedRequests, monthlyRequests, totalPOs, monthlyPOs, totalGRNs, lowStockCount, totalAssets, topCategories, recentPOs] = await Promise.all([
    db.purchaseRequest.count(),
    db.purchaseRequest.count({ where: { status: "APPROVED" } }),
    db.purchaseRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.purchaseOrder.count(),
    db.purchaseOrder.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.goodsReceivedNote.count(),
    db.stock.count({ where: { quantity: { lte: 0 } } }),
    db.asset.count(),
    db.itemCategory.findMany({ include: { _count: { select: { items: true } } }, take: 5 }),
    db.purchaseOrder.findMany({ include: { supplier: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const poTotals = await db.purchaseOrder.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: startOfYear } } });
  const monthlySpend = await db.purchaseOrder.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: startOfMonth } } });

  const stats = [
    { label: "Total Requests (YTD)", value: totalRequests, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Approved Requests", value: approvedRequests, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Purchase Orders (YTD)", value: totalPOs, icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Spend (YTD)", value: formatCurrency(poTotals._sum.totalAmount ?? 0), icon: DollarSign, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "GRNs Processed", value: totalGRNs, icon: Package, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Assets Registered", value: totalAssets, icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Year-to-date procurement overview</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">This Month</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">New Requests</span><span className="font-medium">{monthlyRequests}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">New POs</span><span className="font-medium">{monthlyPOs}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Total Spend</span><span className="font-semibold text-blue-600">{formatCurrency(monthlySpend._sum.totalAmount ?? 0)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Low/Out of Stock Items</span><span className={`font-medium ${lowStockCount > 0 ? "text-red-600" : "text-green-600"}`}>{lowStockCount}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Item Categories</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topCategories.length === 0 ? <p className="text-sm text-gray-400">No categories yet</p> : topCategories.map((c) => (
              <div key={c.id} className="flex justify-between text-sm"><span className="text-gray-600">{c.name}</span><span className="font-medium">{c._count.items} items</span></div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Purchase Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recentPOs.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-400"><p className="text-sm">No purchase orders yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide"><th className="px-6 py-3 text-left">PO #</th><th className="px-6 py-3 text-left">Supplier</th><th className="px-6 py-3 text-left">Status</th><th className="px-6 py-3 text-right">Total</th><th className="px-6 py-3 text-left">Date</th></tr></thead>
                <tbody className="divide-y">
                  {recentPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-blue-600">{po.poNumber}</td>
                      <td className="px-6 py-3 text-gray-600">{po.supplier.name}</td>
                      <td className="px-6 py-3 text-gray-500">{po.status.replace(/_/g, " ")}</td>
                      <td className="px-6 py-3 text-right font-medium">{formatCurrency(po.totalAmount)}</td>
                      <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(po.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
