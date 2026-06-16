export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, statusColor, priorityColor } from "@/lib/utils";
import { FileText, Plus } from "lucide-react";

const PENDING_STATUSES = [
  "SUBMITTED",
  "PENDING_SUPERVISOR_APPROVAL",
  "PENDING_MANAGER_APPROVAL",
  "PENDING_DEPT_HEAD_APPROVAL",
  "CHECKING_STOCK",
  "AVAILABLE_IN_STOCK",
  "PURCHASE_REQUIRED",
  "QUOTATION_PENDING",
  "PO_CREATED",
] as const;

const APPROVED_STATUSES = [
  "APPROVED_BY_SUPERVISOR",
  "APPROVED_BY_DEPT_HEAD",
  "PURCHASE_APPROVED",
  "PURCHASED",
  "GOODS_RECEIVED",
] as const;

const REJECTED_STATUSES = [
  "REJECTED",
  "REJECTED_BY_SUPERVISOR",
  "CANCELLED",
] as const;

function getStatusFilter(tab: string | undefined): { in: string[] } | string | undefined {
  switch (tab) {
    case "pending":
      return { in: [...PENDING_STATUSES] };
    case "approved":
      return { in: [...APPROVED_STATUSES] };
    case "completed":
      return "COMPLETED";
    case "rejected":
      return { in: [...REJECTED_STATUSES] };
    default:
      return undefined;
  }
}

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const params = await searchParams;
  const activeTab = params.status ?? "all";
  const statusFilter = getStatusFilter(activeTab);

  const whereClause: any = { requesterId: user.id };
  if (statusFilter) {
    whereClause.status = statusFilter;
  }

  const requests = await db.purchaseRequest.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          <p className="text-gray-500 mt-1">Track and manage your purchase requests</p>
        </div>
        <Link href="/dashboard/requests/new">
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            New Request
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/dashboard/requests" : `/dashboard/requests?status=${tab.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="text-base font-medium text-gray-500">No requests found</p>
              <p className="text-sm text-gray-400 mt-1">
                {activeTab === "all"
                  ? "You haven't created any requests yet."
                  : `No ${activeTab} requests found.`}
              </p>
              {activeTab === "all" && (
                <Link href="/dashboard/requests/new" className="mt-4">
                  <Button size="sm">Create your first request</Button>
                </Link>
              )}
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
                  {requests.map((req) => (
                    <tr key={req.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/requests/${req.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {req.requestNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-[220px] truncate text-gray-700">{req.purpose}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {req.requestType?.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={priorityColor(req.priority)}>{req.priority}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{req._count.items}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {formatCurrency(Number(req.estimatedTotal ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColor(req.status)}>
                          {req.status?.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(req.requestDate ?? req.createdAt)}
                      </td>
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
