export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, statusColor } from "@/lib/utils";
import { CheckCircle, FileSearch, Plus } from "lucide-react";

export default async function QuotationsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!["ADMIN", "PROCUREMENT", "MANAGEMENT"].includes(user.role)) redirect("/dashboard");

  const quotations = await db.quotation.findMany({
    where: user.activeCompanyId
      ? { request: { is: { OR: [{ procurementCompanyId: user.activeCompanyId }, { procurementCompanyId: null }] } } }
      : undefined,
    include: {
      supplier: { select: { name: true, code: true } },
      request: { select: { id: true, requestNumber: true, purpose: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-500 text-sm mt-0.5">Compare supplier offers and select the winning quotation</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/quotations/new"><Plus className="h-4 w-4" /> New Quotation</Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileSearch className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-base font-medium">No quotations yet</p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/dashboard/quotations/new">Add first quotation</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quotation #</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Request #</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        <Link href={`/dashboard/quotations/${q.id}`} className="text-blue-600 hover:underline">{q.quotationNumber}</Link>
                      </td>
                      <td className="px-6 py-3"><Link href={`/dashboard/requests/${q.request.id}`} className="text-blue-600 hover:underline">{q.request.requestNumber}</Link></td>
                      <td className="px-6 py-3"><div className="font-medium">{q.supplier.name}</div><div className="text-xs text-gray-500">{q.supplier.code}</div></td>
                      <td className="px-6 py-3 text-right">{q._count.items}</td>
                      <td className="px-6 py-3 text-right font-medium">{formatCurrency(q.totalAmount)}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={statusColor(q.status)}>{q.status}</Badge>
                          {q.isSelected && <Badge className="bg-green-100 text-green-700"><CheckCircle className="mr-1 h-3 w-3" />Selected</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{formatDate(q.createdAt)}</td>
                      <td className="px-6 py-3 text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/quotations/${q.id}`}>View</Link>
                        </Button>
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
