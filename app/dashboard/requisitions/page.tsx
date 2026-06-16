import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency, statusColor, priorityColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { format } from "date-fns";

export default async function RequisitionsPage() {
  const requisitions = await db.purchaseRequisition.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Requisitions</h1>
          <p className="text-sm text-gray-500 mt-1">{requisitions.length} total requisitions</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/requisitions/new">
            <Plus className="w-4 h-4" /> New Requisition
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {requisitions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No requisitions yet</p>
              <p className="text-xs mt-1">Create your first purchase requisition</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">PR #</th>
                    <th className="px-6 py-3 text-left">Title</th>
                    <th className="px-6 py-3 text-left">Requested By</th>
                    <th className="px-6 py-3 text-left">Priority</th>
                    <th className="px-6 py-3 text-left">Amount</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requisitions.map((pr) => (
                    <tr key={pr.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/requisitions/${pr.id}`} className="font-medium text-blue-600 hover:underline">
                          {pr.prNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{pr.title}</p>
                        {pr.department && <p className="text-xs text-gray-400">{pr.department}</p>}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{pr.requestedByName}</td>
                      <td className="px-6 py-4">
                        <Badge className={priorityColor(pr.priority)}>{pr.priority}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{formatCurrency(pr.totalAmount)}</td>
                      <td className="px-6 py-4">
                        <Badge className={statusColor(pr.status)}>{pr.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{format(new Date(pr.createdAt), "MMM d, yyyy")}</td>
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
