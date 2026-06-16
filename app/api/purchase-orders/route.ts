import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await db.purchaseOrder.findMany({ include: { supplier: true, items: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN","PROCUREMENT"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { supplierId, requestId, items, deliveryDate, paymentTerms, notes, tax } = body;
  if (!supplierId || !items?.length) return NextResponse.json({ error: "Supplier and items are required" }, { status: 400 });

  const count = await db.purchaseOrder.count();
  const year = new Date().getFullYear();
  const poNumber = `PO-${year}-${String(count + 1).padStart(4, "0")}`;
  const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = tax ?? 0;

  const po = await db.purchaseOrder.create({
    data: {
      poNumber, supplierId, requestId: requestId ?? null, issuedById: user.id, issuedByName: user.name,
      subtotal, tax: taxAmount, totalAmount: subtotal + taxAmount,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null, paymentTerms, notes,
      items: { create: items.map((item: { itemId?: string; itemName: string; description?: string; quantity: number; unit?: string; unitPrice: number; tax?: number }) => ({ itemId: item.itemId, itemName: item.itemName, description: item.description, quantity: item.quantity, unit: item.unit ?? "pcs", unitPrice: item.unitPrice, tax: item.tax ?? 0, totalPrice: item.quantity * item.unitPrice })) },
    },
    include: { supplier: true, items: true },
  });

  if (requestId) await db.purchaseRequest.update({ where: { id: requestId }, data: { status: "PO_CREATED" } });
  return NextResponse.json(po, { status: 201 });
}
