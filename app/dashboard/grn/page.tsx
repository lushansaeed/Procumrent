import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, statusColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, PackageCheck } from "lucide-react";

export default async function GRNPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const grns = await db.goodsReceivedNote.findMany({
    include: { po: { include: { supplier: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods Received Notes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{grns.length} total GRNs</p>
        </div>
        {["ADMIN", "STOREKEEPER", "PROCUREMENT"].includes(user.role) && (
          <Button asChild><Link href="/dashboard/grn/new"><Plus className="w-4 h-4" /> New GRN</Link></Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {grns.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <PackageCheck className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No GRNs yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">GRN #</th>
                    <th className="px-6 py-3 text-left">PO #</th>
                    <th className="px-6 py-3 text-left">Supplier</th>
                    <th className="px-6 py-3 text-left">Received At</th>
                    <th className="px-6 py-3 text-left">Received By</th>
                    <th className="px-6 py-3 text-left">Items</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grns.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-blue-600">{g.grnNumber}</td>
                      <td className="px-6 py-3 text-gray-600">{g.po.poNumber}</td>
                      <td className="px-6 py-3 text-gray-600">{g.po.supplier.name}</td>
                      <td className="px-6 py-3 text-gray-600">{g.receivedAt}</td>
                      <td className="px-6 py-3 text-gray-600">{g.receivedByName}</td>
                      <td className="px-6 py-3 text-gray-500">{g.items.length}</td>
                      <td className="px-6 py-3"><Badge className={statusColor(g.status)}>{g.status}</Badge></td>
                      <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(g.createdAt)}</td>
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
