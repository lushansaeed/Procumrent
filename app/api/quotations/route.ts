import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId");
  const quotations = await db.quotation.findMany({ where: requestId ? { requestId } : undefined, include: { supplier: true, items: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(quotations);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN","PROCUREMENT"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { requestId, supplierId, totalAmount, deliveryDays, warranty, paymentTerms, availability, remarks, items } = body;
  if (!requestId || !supplierId) return NextResponse.json({ error: "requestId and supplierId required" }, { status: 400 });
  const count = await db.quotation.count();
  const year = new Date().getFullYear();
  const quotationNumber = `QT-${year}-${String(count + 1).padStart(4, "0")}`;
  const requestRecord = await db.purchaseRequest.findUnique({ where: { id: requestId }, select: { status: true } });
  if (!requestRecord) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  const quotation = await db.quotation.create({
    data: {
      quotationNumber, requestId, supplierId, totalAmount: totalAmount ?? 0, deliveryDays, warranty, paymentTerms, availability, remarks,
      items: { create: (items ?? []).map((i: { itemName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }) => ({ itemName: i.itemName, quantity: i.quantity, unit: i.unit ?? "pcs", unitPrice: i.unitPrice, totalPrice: i.totalPrice })) },
    },
    include: { supplier: true, items: true },
  });
  if (!["SUPPLIER_SELECTED", "PO_CREATED"].includes(requestRecord.status)) {
    await db.purchaseRequest.update({
      where: { id: requestId },
      data: {
        status: "QUOTATION_PENDING",
        statusHistory: {
          create: {
            status: "QUOTATION_PENDING",
            changedBy: user.id,
            changedByName: user.name,
            comment: `Quotation ${quotationNumber} recorded.`,
          },
        },
      },
    });
  }
  return NextResponse.json(quotation, { status: 201 });
}
