import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency, priorityColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default async function ApprovalsPage() {
  const pending = await db.purchaseRequisition.findMany({
    where: { status: "PENDING" },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: { items: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pending.length} requisition{pending.length !== 1 ? "s" : ""} awaiting approval
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CheckCircle className="w-10 h-10 mb-3 opacity-40 text-green-500" />
            <p className="text-sm font-medium text-gray-600">All caught up!</p>
            <p className="text-xs mt-1">No requisitions pending approval</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((pr) => (
            <Card key={pr.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center mt-0.5">
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/requisitions/${pr.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                          {pr.prNumber}
                        </Link>
                        <Badge className={priorityColor(pr.priority)}>{pr.priority}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{pr.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>Requested by {pr.requestedByName}</span>
                        {pr.department && <span>· {pr.department}</span>}
                        <span>· {format(new Date(pr.createdAt), "MMM d, yyyy")}</span>
                        <span>· {pr.items.length} item{pr.items.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(pr.totalAmount)}</p>
                    <Button size="sm" asChild>
                      <Link href={`/dashboard/requisitions/${pr.id}`}>Review</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
