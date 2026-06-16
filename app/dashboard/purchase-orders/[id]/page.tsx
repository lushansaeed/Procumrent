import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency, statusColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { UpdateStatusButton } from "./update-status";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: true, requisition: true },
  });

  if (!po) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/purchase-orders"><ArrowLeft className="w-4 h-4" /> Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
            <p className="text-sm text-gray-500">Supplier: {po.supplier.name}</p>
          </div>
        </div>
        <Badge className={statusColor(po.status)}>{po.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-gray-500">Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Supplier" value={po.supplier.name} />
            <Row label="Issued By" value={po.issuedByName} />
            <Row label="Created" value={format(new Date(po.createdAt), "MMM d, yyyy HH:mm")} />
            {po.deliveryDate && <Row label="Delivery Date" value={format(new Date(po.deliveryDate), "MMM d, yyyy")} />}
            {po.terms && <Row label="Terms" value={po.terms} />}
            <Row label="Total Amount" value={formatCurrency(po.totalAmount)} bold />
          </CardContent>
        </Card>

        {po.requisition && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-gray-500">Linked Requisition</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <Link href={`/dashboard/requisitions/${po.requisition.id}`} className="text-blue-600 hover:underline font-medium">
                {po.requisition.prNumber}
              </Link>
              <p className="text-gray-500 mt-1">{po.requisition.title}</p>
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
              {po.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-3">
                    <p className="font-medium">{item.itemName}</p>
                    {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                  </td>
                  <td className="px-6 py-3 text-right">{item.quantity}</td>
                  <td className="px-6 py-3 text-gray-500">{item.unit}</td>
                  <td className="px-6 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50">
                <td colSpan={4} className="px-6 py-3 text-right font-semibold text-gray-700">Total</td>
                <td className="px-6 py-3 text-right font-bold text-blue-600">{formatCurrency(po.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <UpdateStatusButton orderId={po.id} currentStatus={po.status} />
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
