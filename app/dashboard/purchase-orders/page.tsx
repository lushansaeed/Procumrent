import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency, statusColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";
import { format } from "date-fns";

export default async function PurchaseOrdersPage() {
  const orders = await db.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { supplier: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{orders.length} total orders</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/purchase-orders/new">
            <Plus className="w-4 h-4" /> New Order
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ShoppingCart className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No purchase orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">PO #</th>
                    <th className="px-6 py-3 text-left">Supplier</th>
                    <th className="px-6 py-3 text-left">Issued By</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/purchase-orders/${po.id}`} className="font-medium text-blue-600 hover:underline">
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{po.supplier.name}</td>
                      <td className="px-6 py-4 text-gray-600">{po.issuedByName}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-700">{formatCurrency(po.totalAmount)}</td>
                      <td className="px-6 py-4">
                        <Badge className={statusColor(po.status)}>{po.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{format(new Date(po.createdAt), "MMM d, yyyy")}</td>
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
