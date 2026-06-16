import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, comments } = body;

    if (!["APPROVED", "REJECTED", "RETURNED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const request = await db.purchaseRequest.findUnique({
      where: { id },
      include: { approvals: { orderBy: { step: "asc" } } },
    });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Find pending approval step matching user's role
    let approvalStep = request.approvals.find(
      (a) => a.status === "PENDING" && a.role === session.role
    );

    // For REPORTING_MANAGER step, also check if this user is the reporting manager
    if (!approvalStep && session.role === "MANAGER") {
      approvalStep = request.approvals.find(
        (a) => a.status === "PENDING" && a.role === "REPORTING_MANAGER" &&
          request.reportingManagerId === session.hrmsId
      );
    }

    if (!approvalStep) {
      return NextResponse.json({ error: "No pending approval step found for your role" }, { status: 403 });
    }

    // Verify REPORTING_MANAGER step
    if (approvalStep.role === "REPORTING_MANAGER") {
      if (request.reportingManagerId !== session.hrmsId && session.role !== "ADMIN") {
        return NextResponse.json({ error: "You are not the reporting manager for this request" }, { status: 403 });
      }
    }

    // Update approval step
    await db.requestApproval.update({
      where: { id: approvalStep.id },
      data: {
        status,
        comments,
        approverId: session.id,
        approverName: session.name,
      },
    });

    let newRequestStatus = request.status;

    if (status === "APPROVED") {
      // Check if all required approvals are done
      const updatedApprovals = await db.requestApproval.findMany({ where: { requestId: id } });
      const allApproved = updatedApprovals.every((a) => a.status === "APPROVED");
      if (allApproved) {
        newRequestStatus = "CHECKING_STOCK";
        // Notify storekeeper
        const storekeepers = await db.employee.findMany({ where: { procurementRole: "STOREKEEPER" } });
        for (const sk of storekeepers) {
          await createNotification(
            sk.id,
            "STOCK_CHECK_REQUIRED",
            "Stock Check Required",
            `Request ${request.requestNumber} has been approved. Please check stock availability.`,
            id,
            "REQUEST"
          );
        }
      } else {
        // Find next pending step and notify
        const nextStep = updatedApprovals.find((a) => a.status === "PENDING");
        if (nextStep) {
          newRequestStatus = "PENDING_APPROVAL";
        }
      }
    } else if (status === "REJECTED") {
      newRequestStatus = "REJECTED";
    } else if (status === "RETURNED") {
      newRequestStatus = "RETURNED";
    }

    await db.purchaseRequest.update({ where: { id }, data: { status: newRequestStatus } });

    await db.requestStatusHistory.create({
      data: {
        requestId: id,
        status: newRequestStatus,
        comment: comments,
        changedBy: session.id,
        changedByName: session.name,
      },
    });

    // Notify requester
    await createNotification(
      request.requesterId,
      "REQUEST_UPDATE",
      `Request ${status.toLowerCase()}`,
      `Your request ${request.requestNumber} has been ${status.toLowerCase()} by ${session.name}.`,
      id,
      "REQUEST"
    );

    return NextResponse.json({ success: true, requestStatus: newRequestStatus });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
