import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const request = await db.purchaseRequest.findUnique({
      where: { id },
      include: {
        requester: true,
        deliveryLocation: true,
        items: { include: { item: true } },
        approvals: { include: { approver: true }, orderBy: { step: "asc" } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        purchaseOrder: { include: { supplier: true, items: true } },
        quotations: { include: { supplier: true, items: true } },
        stockIssues: { include: { items: true } },
      },
    });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Access control
    if (session.role === "REQUESTER" && request.requesterId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(request);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const request = await db.purchaseRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (request.requesterId !== session.id && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (request.status !== "DRAFT" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Only draft requests can be edited" }, { status: 400 });
    }
    const body = await req.json();
    const { items, approvals, statusHistory, ...updateData } = body;
    const updated = await db.purchaseRequest.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const request = await db.purchaseRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (request.requesterId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (request.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft requests can be cancelled" }, { status: 400 });
    }
    await db.purchaseRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
