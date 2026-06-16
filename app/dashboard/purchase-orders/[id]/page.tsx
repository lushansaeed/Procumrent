export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, statusColor } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { POStatusUpdate } from "./POStatusUpdate";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PODetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getSession();
  if (!user) redirect("/login");

  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: true,
      grns: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
      request: { select: { id: true, requestNumber: true } },
    },
  });

  if (!po) notFound();

  const canEdit = ["ADMIN", "PROCUREMENT", "MANAGEMENT"].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard/purchase-orders"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Purchase Orders
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
            <Badge className={statusColor(po.status)}>{po.status.replace(/_/g, " ")}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-6">
          {/* PO Details */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Supplier</dt>
                  <dd className="mt-1 font-semibold text-gray-900">{po.supplier.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact Person</dt>
                  <dd className="mt-1 text-sm">{po.supplier.contactPerson ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt>
                  <dd className="mt-1 text-sm">{po.supplier.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt>
                  <dd className="mt-1 text-sm">{po.supplier.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery Date</dt>
                  <dd className="mt-1 text-sm">{po.deliveryDate ? formatDate(po.deliveryDate) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Terms</dt>
                  <dd className="mt-1 text-sm">{po.paymentTerms ?? "—"}</dd>
                </div>
                {po.request && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Linked Request</dt>
                    <dd className="mt-1 text-sm">
                      <Link href={`/dashboard/requests/${po.request.id}`} className="text-blue-600 hover:underline">
                        {po.request.requestNumber}
                      </Link>
                    </dd>
                  </div>
                )}
                {po.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</dt>
                    <dd className="mt-1 text-sm">{po.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item, idx) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.itemName}</div>
                          {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3">{item.unit}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{item.receivedQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* GRNs */}
          {po.grns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Goods Received Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GRN #</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Received At</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Received By</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.grns.map((grn) => (
                        <tr key={grn.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{grn.grnNumber}</td>
                          <td className="px-4 py-3 text-gray-500">{grn.receivedAt}</td>
                          <td className="px-4 py-3">{grn.receivedByName}</td>
                          <td className="px-4 py-3 text-right">{grn.items.length}</td>
                          <td className="px-4 py-3">
                            <Badge className={statusColor(grn.status)}>{grn.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(po.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span>{formatCurrency(po.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-3">
                <span>Total Amount</span>
                <span>{formatCurrency(po.totalAmount)}</span>
              </div>
              <div className="pt-3 border-t space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Issued By: </span>
                  <span>{po.issuedByName}</span>
                </div>
                {po.approvedByName && (
                  <div>
                    <span className="text-gray-500">Approved By: </span>
                    <span>{po.approvedByName}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Date: </span>
                  <span>{formatDate(po.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Update */}
          {canEdit && <POStatusUpdate poId={po.id} currentStatus={po.status} />}
        </div>
      </div>
    </div>
  );
}
