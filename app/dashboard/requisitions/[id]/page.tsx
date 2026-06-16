import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency, statusColor, priorityColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { ApproveRejectButtons } from "./approve-buttons";

export default async function RequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pr = await db.purchaseRequisition.findUnique({
    where: { id },
    include: { items: true, approvals: { orderBy: { createdAt: "desc" } }, purchaseOrder: { include: { supplier: true } } },
  });

  if (!pr) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/requisitions"><ArrowLeft className="w-4 h-4" /> Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pr.prNumber}</h1>
            <p className="text-sm text-gray-500">{pr.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColor(pr.status)}>{pr.status}</Badge>
          <Badge className={priorityColor(pr.priority)}>{pr.priority}</Badge>
          {pr.status === "APPROVED" && !pr.purchaseOrder && (
            <Button size="sm" asChild>
              <Link href={`/dashboard/purchase-orders/new?requisitionId=${pr.id}`}>
                <ShoppingCart className="w-4 h-4" /> Create PO
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-gray-500">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Requested By" value={pr.requestedByName} />
            {pr.department && <Row label="Department" value={pr.department} />}
            {pr.description && <Row label="Description" value={pr.description} />}
            <Row label="Created" value={format(new Date(pr.createdAt), "MMM d, yyyy HH:mm")} />
            <Row label="Total Amount" value={formatCurrency(pr.totalAmount)} bold />
          </CardContent>
        </Card>

        {pr.purchaseOrder && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-gray-500">Linked Purchase Order</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <Link href={`/dashboard/purchase-orders/${pr.purchaseOrder.id}`} className="text-blue-600 hover:underline font-medium">
                {pr.purchaseOrder.poNumber}
              </Link>
              <p className="text-gray-500 mt-1">Supplier: {pr.purchaseOrder.supplier.name}</p>
              <Badge className={`mt-2 ${statusColor(pr.purchaseOrder.status)}`}>{pr.purchaseOrder.status}</Badge>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 text-xs font-medium uppercase">
                <th className="px-6 py-3 text-left">Item</th>
                <th className="px-6 py-3 text-right">Qty</th>
                <th className="px-6 py-3 text-left">Unit</th>
                <th className="px-6 py-3 text-right">Unit Price</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pr.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-3">
                    <p className="font-medium">{item.itemName}</p>
                    {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                  </td>
                  <td className="px-6 py-3 text-right">{item.quantity}</td>
                  <td className="px-6 py-3 text-gray-500">{item.unit}</td>
                  <td className="px-6 py-3 text-right">{formatCurrency(item.estimatedPrice)}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50">
                <td colSpan={4} className="px-6 py-3 text-right font-semibold text-gray-700">Total</td>
                <td className="px-6 py-3 text-right font-bold text-blue-600">{formatCurrency(pr.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {pr.status === "PENDING" && <ApproveRejectButtons requisitionId={pr.id} />}

      {pr.approvals.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Approval History</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pr.approvals.map((approval) => (
              <div key={approval.id} className="flex items-start gap-3 text-sm">
                <Badge className={statusColor(approval.status)}>{approval.status}</Badge>
                <div>
                  <p className="font-medium text-gray-900">{approval.approverName}</p>
                  {approval.comments && <p className="text-gray-500 mt-0.5">{approval.comments}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(approval.createdAt), "MMM d, yyyy HH:mm")}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={bold ? "font-semibold text-blue-600" : "text-gray-900 text-right"}>{value}</span>
    </div>
  );
}
