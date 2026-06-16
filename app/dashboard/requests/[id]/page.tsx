import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusColor, priorityColor, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Package } from "lucide-react";
import { ApprovalActions } from "./ApprovalActions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RequestDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");

  const request = await db.purchaseRequest.findUnique({
    where: { id },
    include: {
      items: true,
      approvals: { orderBy: { step: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      deliveryLocation: true,
    },
  });

  if (!request) notFound();

  const canApprove =
    request.status === "PENDING_SUPERVISOR_APPROVAL" &&
    (session.role === "MANAGER" || session.role === "DEPARTMENT_HEAD");

  const canCheckStock =
    request.status === "CHECKING_STOCK" && session.role === "STOREKEEPER";

  const canIssueStock =
    request.status === "AVAILABLE_IN_STOCK" && session.role === "STOREKEEPER";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard/requests"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Requests
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">
              {request.requestNumber}
            </h1>
            <Badge className={statusColor(request.status)}>
              {request.status.replace(/_/g, " ")}
            </Badge>
            <Badge className={priorityColor(request.priority)}>
              {request.priority}
            </Badge>
            <Badge className="bg-gray-100 text-gray-700">{request.requestType}</Badge>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Requester Name</dt>
                  <dd className="mt-1 text-sm font-semibold">{request.requesterName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Department</dt>
                  <dd className="mt-1 text-sm">{request.requesterDepartment}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Section</dt>
                  <dd className="mt-1 text-sm">{request.requesterSection || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Designation</dt>
                  <dd className="mt-1 text-sm">{request.requesterDesignation || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Location</dt>
                  <dd className="mt-1 text-sm">{request.requesterLocation || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Reporting Manager</dt>
                  <dd className="mt-1 text-sm">{request.reportingManagerName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Request Type</dt>
                  <dd className="mt-1 text-sm">{request.requestType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Priority</dt>
                  <dd className="mt-1">
                    <Badge className={priorityColor(request.priority)}>
                      {request.priority}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Required Date</dt>
                  <dd className="mt-1 text-sm">
                    {request.requiredDate ? formatDate(request.requiredDate) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Delivery Location</dt>
                  <dd className="mt-1 text-sm">
                    {(request.deliveryLocation as { name: string } | null)?.name || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Purpose</dt>
                  <dd className="mt-1 text-sm">{request.purpose || "—"}</dd>
                </div>
                {request.remarks && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Remarks</dt>
                    <dd className="mt-1 text-sm">{request.remarks}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Requested Items Card */}
          <Card>
            <CardHeader>
              <CardTitle>Requested Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8">#</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Unit Price</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.items.map((item, index) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.itemName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.itemDescription || "—"}</td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3">{item.unit}</td>
                        <td className="px-4 py-3 text-right">
                          {item.estimatedPrice != null ? formatCurrency(item.estimatedPrice) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {item.totalPrice != null ? formatCurrency(item.totalPrice) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/50">
                      <td colSpan={6} className="px-4 py-3 text-right font-semibold">
                        Estimated Total
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {request.estimatedTotal != null
                          ? formatCurrency(request.estimatedTotal)
                          : "—"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Approval Steps Card */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Steps</CardTitle>
            </CardHeader>
            <CardContent>
              {request.approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approval steps defined.</p>
              ) : (
                <div className="space-y-4">
                  {request.approvals.map((approval, index) => (
                    <div key={approval.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2 ${
                            approval.status === "APPROVED"
                              ? "bg-green-100 border-green-500 text-green-700"
                              : approval.status === "REJECTED"
                              ? "bg-red-100 border-red-500 text-red-700"
                              : approval.status === "RETURNED"
                              ? "bg-yellow-100 border-yellow-500 text-yellow-700"
                              : "bg-gray-100 border-gray-300 text-gray-500"
                          }`}
                        >
                          {approval.step}
                        </div>
                        {index < request.approvals.length - 1 && (
                          <div className="mt-1 h-full min-h-[1rem] w-px bg-border" />
                        )}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{approval.label || approval.role}</span>
                          <Badge className={statusColor(approval.status)}>
                            {approval.status}
                          </Badge>
                        </div>
                        {approval.approverName && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {approval.approverName}
                          </p>
                        )}
                        {approval.comments && (
                          <p className="mt-1 text-sm italic text-muted-foreground">
                            &ldquo;{approval.comments}&rdquo;
                          </p>
                        )}
                        {approval.createdAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(approval.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Status History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              {request.statusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <div className="space-y-3">
                  {request.statusHistory.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-border pl-3 space-y-0.5">
                      <Badge className={`${statusColor(entry.status)} text-xs`}>
                        {entry.status.replace(/_/g, " ")}
                      </Badge>
                      <p className="text-xs font-medium">{entry.changedByName}</p>
                      {entry.comment && (
                        <p className="text-xs text-muted-foreground">{entry.comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          {(canApprove || canCheckStock || canIssueStock) && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canApprove && (
                  <ApprovalActions requestId={request.id} />
                )}
                {canCheckStock && (
                  <Link href={`/dashboard/requests/${request.id}/check-stock`}>
                    <Button className="w-full" variant="outline">
                      <Package className="mr-2 h-4 w-4" />
                      Check Stock
                    </Button>
                  </Link>
                )}
                {canIssueStock && (
                  <Link href={`/dashboard/requests/${request.id}/issue-stock`}>
                    <Button className="w-full">
                      <Package className="mr-2 h-4 w-4" />
                      Issue Stock
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
