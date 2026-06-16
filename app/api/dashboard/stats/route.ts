import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfMonth } from "date-fns";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const monthStart = startOfMonth(now);

  const [myPending, myApproved, myCompleted, myRejected, pendingApprovals, , monthlySpend, pendingPOs, pendingGRN] = await Promise.all([
    db.purchaseRequest.count({ where: { requesterId: user.id, status: { in: ["SUBMITTED","PENDING_SUPERVISOR_APPROVAL","CHECKING_STOCK","PURCHASE_REQUIRED","PO_CREATED","PURCHASED"] } } }),
    db.purchaseRequest.count({ where: { requesterId: user.id, status: { in: ["DELIVERED","COMPLETED"] } } }),
    db.purchaseRequest.count({ where: { requesterId: user.id, status: "COMPLETED" } }),
    db.purchaseRequest.count({ where: { requesterId: user.id, status: { in: ["REJECTED"] } } }),
    db.purchaseRequest.count({ where: { status: { in: ["SUBMITTED","PENDING_SUPERVISOR_APPROVAL","FINANCE_APPROVAL_PENDING"] } } }),
    Promise.resolve(0),
    db.purchaseOrder.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { totalAmount: true } }),
    db.purchaseOrder.count({ where: { status: { in: ["DRAFT","PENDING_APPROVAL","APPROVED"] } } }),
    db.goodsReceivedNote.count({ where: { status: "DRAFT" } }),
  ]);

  return NextResponse.json({
    myRequests: { pending: myPending, approved: myApproved, completed: myCompleted, rejected: myRejected },
    pendingApprovals,
    stockAlerts: 0,
    monthlySpend: monthlySpend._sum.totalAmount ?? 0,
    pendingPOs,
    pendingGRN,
  });
}
