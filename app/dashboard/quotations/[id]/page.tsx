export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, statusColor } from "@/lib/utils";
import { QuotationActions } from "./quotation-actions";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!["ADMIN", "PROCUREMENT", "MANAGEMENT"].includes(user.role)) redirect("/dashboard");

  const { id } = await params;
  const quotation = await db.quotation.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: true,
      request: {
        include: {
          purchaseOrder: { select: { id: true, poNumber: true } },
        },
      },
    },
  });

  if (!quotation) notFound();

  const canAct = ["ADMIN", "PROCUREMENT"].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/quotations"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{quotation.quotationNumber}</h1>
            <Badge className={statusColor(quotation.status)}>{quotation.status}</Badge>
            {quotation.isSelected && (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="mr-1 h-3 w-3" />
                Selected
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">Created {formatDate(quotation.createdAt)}</p>
        </div>
        {canAct && (
          <QuotationActions
            quotationId={quotation.id}
            requestId={quotation.requestId}
            supplierId={quotation.supplierId}
            isSelected={quotation.isSelected}
            hasPurchaseOrder={Boolean(quotation.request.purchaseOrder)}
            items={quotation.items.map((item) => ({
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
            }))}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Quotation Summary</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Info label="Request" value={<Link href={`/dashboard/requests/${quotation.request.id}`} className="text-blue-600 hover:underline">{quotation.request.requestNumber}</Link>} />
                <Info label="Supplier" value={quotation.supplier.name} />
                <Info label="Delivery Days" value={quotation.deliveryDays != null ? `${quotation.deliveryDays} days` : "—"} />
                <Info label="Availability" value={quotation.availability || "—"} />
                <Info label="Payment Terms" value={quotation.paymentTerms || "—"} />
                <Info label="Warranty" value={quotation.warranty || "—"} />
                {quotation.selectionReason && <Info label="Selection Reason" value={quotation.selectionReason} wide />}
                {quotation.remarks && <Info label="Remarks" value={quotation.remarks} wide />}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Quoted Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Item</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Unit</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item, index) => (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.itemName}</td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3">{item.unit}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-3 text-right font-semibold">Total</td>
                      <td className="px-4 py-3 text-right text-base font-bold">{formatCurrency(quotation.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Supplier</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Info label="Code" value={quotation.supplier.code} />
              <Info label="Contact" value={quotation.supplier.contactPerson || "—"} />
              <Info label="Phone" value={quotation.supplier.phone || "—"} />
              <Info label="Email" value={quotation.supplier.email || "—"} />
            </CardContent>
          </Card>

          {quotation.request.purchaseOrder && (
            <Card>
              <CardHeader><CardTitle className="text-base">Purchase Order</CardTitle></CardHeader>
              <CardContent>
                <Link href={`/dashboard/purchase-orders/${quotation.request.purchaseOrder.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                  {quotation.request.purchaseOrder.poNumber}
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 font-medium text-gray-900">{value}</dd>
    </div>
  );
}
