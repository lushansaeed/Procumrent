import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { buildApprovalSteps, requestStatusForApprovalRole } from "@/lib/workflow";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    let where: Record<string, unknown> = {};

    if (session.role === "REQUESTER") {
      where = { requesterId: session.id };
    } else if (session.role === "MANAGER" || session.role === "DEPARTMENT_HEAD") {
      where = { reportingManagerId: session.hrmsId };
    } else if (session.role === "FINANCE") {
      where = { status: { in: ["FINANCE_APPROVAL_PENDING", "APPROVED", "PO_CREATED", "DELIVERED"] } };
    }

    if (status) where.status = status;
    if (session.activeCompanyId) {
      where = { ...where, OR: [{ procurementCompanyId: session.activeCompanyId }, { procurementCompanyId: null }] };
    }

    const [requests, total] = await Promise.all([
      db.purchaseRequest.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true, department: true } },
          deliveryLocation: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.purchaseRequest.count({ where }),
    ]);

    return NextResponse.json({ requests, total, page, limit });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();

    const year = new Date().getFullYear();
    const count = await db.purchaseRequest.count();
    const requestNumber = `PR-${year}-${String(count + 1).padStart(4, "0")}`;

    const items: Array<{
      itemId?: string;
      itemName: string;
      categoryId?: string;
      quantity: number;
      unit: string;
      estimatedPrice: number;
    }> = body.items ?? [];
    const estimatedTotal = items.reduce((sum: number, i) => sum + (i.quantity * i.estimatedPrice), 0);
    const requestType = body.requestType ?? "PURCHASE";
    const priority = body.priority ?? "NORMAL";
    const approvalSteps = await buildApprovalSteps({
      requestType,
      priority,
      department: session.department,
      estimatedTotal,
    });
    const initialStatus = requestStatusForApprovalRole(approvalSteps[0]?.role ?? "REPORTING_MANAGER");

    const request = await db.purchaseRequest.create({
      data: {
        requestNumber,
        requesterId: session.id,
        requesterName: session.name,
        requesterEmail: session.email,
        requesterDepartment: session.department,
        requesterSection: session.section,
        requesterDesignation: session.designation,
        requesterLocation: session.workLocation,
        reportingManagerId: session.reportingManagerId,
        reportingManagerName: session.reportingManagerName,
        procurementCompanyId: session.activeCompanyId,
        procurementProjectId: session.activeProjectId,
        deliveryLocationId: body.deliveryLocationId,
        requestType,
        priority,
        requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
        purpose: body.purpose,
        remarks: body.remarks,
        status: initialStatus,
        estimatedTotal,
        items: {
          create: items.map((item) => ({
            itemId: item.itemId ?? null,
            itemName: item.itemName,
            categoryId: item.categoryId ?? null,
            quantity: item.quantity,
            unit: item.unit ?? "pcs",
            estimatedPrice: item.estimatedPrice ?? 0,
            totalPrice: item.quantity * (item.estimatedPrice ?? 0),
          })),
        },
        statusHistory: {
          create: {
            status: initialStatus,
            changedBy: session.id,
            changedByName: session.name,
            comment: "Request submitted",
          },
        },
      },
      include: { items: true, statusHistory: true },
    });

    await db.requestApproval.createMany({
      data: approvalSteps.map((s) => ({
        requestId: request.id,
        step: s.step,
        role: s.role,
        label: s.label,
        status: "PENDING",
      })),
    });

    // Notify reporting manager
    if (session.reportingManagerId) {
      const manager = await db.employee.findFirst({ where: { hrmsId: session.reportingManagerId } });
      if (manager) {
        await createNotification(
          manager.id,
          "APPROVAL_REQUIRED",
          "New Purchase Request",
          `${session.name} submitted request ${requestNumber} requiring your approval.`,
          request.id,
          "REQUEST"
        );
      }
    }

    return NextResponse.json(request, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
