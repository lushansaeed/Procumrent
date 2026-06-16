import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatCurrency, statusColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor } from "lucide-react";

export default async function AssetsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const assets = await db.asset.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asset Register</h1>
        <p className="text-sm text-gray-500 mt-0.5">{assets.length} assets registered</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {assets.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <Monitor className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No assets registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">Asset Code</th>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Serial #</th>
                    <th className="px-6 py-3 text-left">Assigned To</th>
                    <th className="px-6 py-3 text-left">Department</th>
                    <th className="px-6 py-3 text-left">Purchase Price</th>
                    <th className="px-6 py-3 text-left">Condition</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Warranty Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assets.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-blue-600">{a.assetCode}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{a.name}</td>
                      <td className="px-6 py-3 text-gray-500">{a.serialNumber ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-600">{a.assignedToName ?? "Unassigned"}</td>
                      <td className="px-6 py-3 text-gray-500">{a.department ?? "—"}</td>
                      <td className="px-6 py-3">{formatCurrency(a.purchasePrice)}</td>
                      <td className="px-6 py-3"><Badge className={statusColor(a.condition)}>{a.condition}</Badge></td>
                      <td className="px-6 py-3"><Badge className={statusColor(a.status)}>{a.status.replace(/_/g, " ")}</Badge></td>
                      <td className="px-6 py-3 text-gray-400 text-xs">{a.warrantyExpiry ? formatDate(a.warrantyExpiry) : "—"}</td>
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
