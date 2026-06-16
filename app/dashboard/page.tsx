export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, statusColor, priorityColor } from "@/lib/utils";
import { FileText, CheckCircle, ShoppingCart, Package, TrendingUp, Clock, Plus, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const role = user.role;
  const canApprove = ["ADMIN", "MANAGEMENT", "PROCUREMENT", "FINANCE", "DEPARTMENT_HEAD", "MANAGER"].includes(role);
  const isProcurement = role === "PROCUREMENT" || role === "ADMIN";
  const isStorekeeper = role === "STOREKEEPER" || role === "ADMIN";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const pendingStatuses = [
    "SUBMITTED",
    "PENDING_SUPERVISOR_APPROVAL",
    "PENDING_MANAGER_APPROVAL",
    "PENDING_DEPT_HEAD_APPROVAL",
    "CHECKING_STOCK",
    "AVAILABLE_IN_STOCK",
    "PURCHASE_REQUIRED",
    "QUOTATION_PENDING",
    "PO_CREATED",
  ];

  // Parallel fetches
  const [
    pendingRequestsCount,
    completedRequestsCount,
    monthlySpendResult,
    recentRequests,
    pendingApprovalsCount,
    procurementStats,
    lowStockCount,
  ] = await Promise.all([
    db.purchaseRequest.count({
      where: {
        requesterId: user.id,
        status: { in: pendingStatuses as any[] },
      },
    }),
    db.purchaseRequest.count({
      where: {
        requesterId: user.id,
        status: "COMPLETED" as any,
      },
    }),
    db.purchaseRequest.aggregate({
      where: {
        requesterId: user.id,
        requestDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { estimatedTotal: true },
    }),
    db.purchaseRequest.findMany({
      where: { requesterId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { items: true } } },
    }),
    canApprove
      ? db.requestApproval.count({
          where: {
            approverId: user.id,
            status: "PENDING" as any,
          },
        })
      : Promise.resolve(0),
    isProcurement
      ? Promise.all([
          db.purchaseOrder.count({ where: { status: "PENDING_APPROVAL" as any } }),
          db.goodsReceivedNote.count({ where: { status: "DRAFT" as any } }),
        ])
      : Promise.resolve([0, 0]),
    Promise.resolve(0), // low stock count via raw query if needed
  ]);

  const monthlySpend = monthlySpendResult._sum.estimatedTotal ?? 0;
  const [posPendingApproval, grnsPending] = Array.isArray(procurementStats)
    ? procurementStats
    : [0, 0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user.name}</p>
        </div>
        <Link href="/dashboard/requests/new">
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            New Request
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">My Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{pendingRequestsCount}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{completedRequestsCount}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Monthly Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{formatCurrency(Number(monthlySpend))}</div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>

        {canApprove ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pending Approvals</CardTitle>
              <FileText className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{pendingApprovalsCount}</div>
              <p className="text-xs text-gray-500 mt-1">Need your review</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{pendingRequestsCount + completedRequestsCount}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Procurement stats */}
      {isProcurement && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">POs Pending Approval</CardTitle>
              <ShoppingCart className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{posPendingApproval}</div>
              <Link href="/dashboard/purchase-orders" className="text-xs text-blue-600 hover:underline mt-1 block">
                View all &rarr;
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">GRNs Pending</CardTitle>
              <Package className="h-4 w-4 text-teal-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{grnsPending}</div>
              <Link href="/dashboard/grn" className="text-xs text-blue-600 hover:underline mt-1 block">
                View all &rarr;
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Storekeeper low stock */}
      {isStorekeeper && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{lowStockCount}</div>
              <Link href="/dashboard/stock" className="text-xs text-blue-600 hover:underline mt-1 block">
                View inventory &rarr;
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Requests</CardTitle>
          <Link href="/dashboard/requests">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No requests yet</p>
              <Link href="/dashboard/requests/new" className="mt-3">
                <Button size="sm">Create your first request</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Request #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Purpose</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((req) => (
                    <tr key={req.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/requests/${req.id}`} className="text-blue-600 hover:underline font-medium">
                          {req.requestNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-gray-700">{req.purpose}</td>
                      <td className="px-4 py-3 text-gray-600">{req.requestType?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">
                        <Badge className={priorityColor(req.priority)}>{req.priority}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{req._count.items}</td>
                      <td className="px-4 py-3 text-gray-700">{formatCurrency(Number(req.estimatedTotal ?? 0))}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColor(req.status)}>{req.status?.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(req.requestDate ?? req.createdAt)}</td>
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
