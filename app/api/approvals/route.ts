import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find requests pending this user's action based on role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let requests: any[];

  if (["ADMIN", "MANAGEMENT"].includes(user.role)) {
    requests = await db.purchaseRequest.findMany({
      where: {
        status: {
          in: ["SUBMITTED", "PENDING_SUPERVISOR_APPROVAL", "PENDING_DEPT_HEAD_APPROVAL",
               "FINANCE_APPROVAL_PENDING", "CHECKING_STOCK", "PURCHASE_REQUIRED"],
        },
      },
      include: { approvals: true },
      orderBy: { createdAt: "asc" },
    });
  } else if (user.role === "MANAGER") {
    // Manager sees requests from their direct reports
    requests = await db.purchaseRequest.findMany({
      where: {
        reportingManagerId: user.hrmsId,
        status: { in: ["SUBMITTED", "PENDING_SUPERVISOR_APPROVAL"] },
      },
      include: { approvals: true },
      orderBy: { createdAt: "asc" },
    });
  } else if (user.role === "DEPARTMENT_HEAD") {
    requests = await db.purchaseRequest.findMany({
      where: {
        requesterDepartment: user.department ?? "",
        status: { in: ["PENDING_DEPT_HEAD_APPROVAL"] },
      },
      include: { approvals: true },
      orderBy: { createdAt: "asc" },
    });
  } else if (user.role === "PROCUREMENT") {
    requests = await db.purchaseRequest.findMany({
      where: {
        status: {
          in: ["CHECKING_STOCK", "PURCHASE_REQUIRED", "QUOTATION_PENDING",
               "SUPPLIER_SELECTED", "PURCHASED"],
        },
      },
      include: { approvals: true },
      orderBy: { createdAt: "asc" },
    });
  } else if (user.role === "FINANCE") {
    requests = await db.purchaseRequest.findMany({
      where: { status: "FINANCE_APPROVAL_PENDING" },
      include: { approvals: true },
      orderBy: { createdAt: "asc" },
    });
  } else if (user.role === "STOREKEEPER") {
    requests = await db.purchaseRequest.findMany({
      where: { status: { in: ["CHECKING_STOCK", "AVAILABLE_IN_STOCK"] } },
      include: { approvals: true, items: true },
      orderBy: { createdAt: "asc" },
    });
  } else {
    requests = [];
  }

  return NextResponse.json(requests);
}
