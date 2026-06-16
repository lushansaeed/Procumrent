import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency, statusColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ShoppingCart, Building2, TrendingUp, ArrowRight } from "lucide-react";
import { startOfMonth } from "date-fns";

export default async function DashboardPage() {
  const [pendingPRs, activePOs, totalSuppliers, monthlySpend, recentPRs, recentPOs] =
    await Promise.all([
      db.purchaseRequisition.count({ where: { status: "PENDING" } }),
      db.purchaseOrder.count({ where: { status: { in: ["SENT", "ACKNOWLEDGED"] } } }),
      db.supplier.count({ where: { status: "ACTIVE" } }),
      db.purchaseOrder.aggregate({
        where: { createdAt: { gte: startOfMonth(new Date()) } },
        _sum: { totalAmount: true },
      }),
      db.purchaseRequisition.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, prNumber: true, title: true, status: true, totalAmount: true, requestedByName: true },
      }),
      db.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { supplier: true },
      }),
    ]);

  const stats = [
    { label: "Pending Requisitions", value: pendingPRs, icon: FileText, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Active Purchase Orders", value: activePOs, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Suppliers", value: totalSuppliers, icon: Building2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Spend This Month", value: formatCurrency(monthlySpend._sum.totalAmount ?? 0), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Procurement overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Requisitions</CardTitle>
            <Link href="/dashboard/requisitions" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentPRs.length === 0 ? (
              <p className="text-sm text-gray-400 px-6 pb-6">No requisitions yet.</p>
            ) : (
              <div className="divide-y">
                {recentPRs.map((pr) => (
                  <Link key={pr.id} href={`/dashboard/requisitions/${pr.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pr.prNumber}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{pr.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{formatCurrency(pr.totalAmount)}</span>
                      <Badge className={statusColor(pr.status)}>{pr.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Purchase Orders</CardTitle>
            <Link href="/dashboard/purchase-orders" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentPOs.length === 0 ? (
              <p className="text-sm text-gray-400 px-6 pb-6">No purchase orders yet.</p>
            ) : (
              <div className="divide-y">
                {recentPOs.map((po) => (
                  <Link key={po.id} href={`/dashboard/purchase-orders/${po.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{po.poNumber}</p>
                      <p className="text-xs text-gray-500">{po.supplier.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{formatCurrency(po.totalAmount)}</span>
                      <Badge className={statusColor(po.status)}>{po.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
