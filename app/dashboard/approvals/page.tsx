import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { statusColor, priorityColor, formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle, ArrowRight, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const approvals = await db.requestApproval.findMany({
    where: {
      approverId: session.id,
      status: "PENDING",
    },
    include: {
      request: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Pending Approvals</h1>
          <Badge className="text-sm font-semibold">
            {approvals.length}
          </Badge>
        </div>
      </div>

      {/* Empty State */}
      {approvals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            You&apos;re all caught up!
          </h2>
          <p className="text-muted-foreground max-w-sm">
            There are no pending approvals requiring your attention right now. Check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => {
            const req = approval.request;
            const purposeTruncated =
              req.purpose && req.purpose.length > 100
                ? req.purpose.slice(0, 100) + "…"
                : req.purpose || "—";

            return (
              <Card key={approval.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Top row: request number + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base">{req.requestNumber}</span>
                        <Badge className="bg-gray-100 text-gray-700">{req.requestType}</Badge>
                        <Badge className={priorityColor(req.priority)}>
                          {req.priority}
                        </Badge>
                        <Badge className={statusColor(req.status)}>
                          {req.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      {/* Requester info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="font-medium text-foreground">{req.requesterName}</span>
                        <span>{req.requesterDepartment}</span>
                      </div>

                      {/* Purpose */}
                      <p className="text-sm text-muted-foreground">{purposeTruncated}</p>

                      {/* Bottom row: amount + date */}
                      <div className="flex items-center gap-6 text-sm flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-semibold">
                            {req.estimatedTotal != null
                              ? formatCurrency(req.estimatedTotal)
                              : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Submitted {formatDate(req.requestDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="shrink-0">
                      <Link href={`/dashboard/requests/${req.id}`}>
                        <Button variant="outline" size="sm" className="whitespace-nowrap">
                          Review
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
