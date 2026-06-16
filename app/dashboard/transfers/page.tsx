import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, statusColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeftRight } from "lucide-react";

export default async function TransfersPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const transfers = await db.stockTransfer.findMany({
    include: { fromLocation: true, toLocation: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Transfers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{transfers.length} total transfers</p>
        </div>
        {["ADMIN", "STOREKEEPER", "PROCUREMENT"].includes(user.role) && (
          <Button asChild><Link href="/dashboard/transfers/new"><Plus className="w-4 h-4" /> New Transfer</Link></Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          {transfers.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400"><ArrowLeftRight className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">No transfers yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide"><th className="px-6 py-3 text-left">Transfer #</th><th className="px-6 py-3 text-left">From</th><th className="px-6 py-3 text-left">To</th><th className="px-6 py-3 text-left">Items</th><th className="px-6 py-3 text-left">Requested By</th><th className="px-6 py-3 text-left">Status</th><th className="px-6 py-3 text-left">Date</th></tr></thead>
                <tbody className="divide-y">
                  {transfers.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-blue-600">{t.transferNumber}</td>
                      <td className="px-6 py-3 text-gray-600">{t.fromLocation.name}</td>
                      <td className="px-6 py-3 text-gray-600">{t.toLocation.name}</td>
                      <td className="px-6 py-3 text-gray-500">{t.items.length} item{t.items.length !== 1 ? "s" : ""}</td>
                      <td className="px-6 py-3 text-gray-600">{t.requestedByName}</td>
                      <td className="px-6 py-3"><Badge className={statusColor(t.status)}>{t.status.replace(/_/g, " ")}</Badge></td>
                      <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(t.createdAt)}</td>
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
