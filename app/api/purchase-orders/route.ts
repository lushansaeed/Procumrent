import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePONumber } from "@/lib/utils";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await db.purchaseOrder.findMany({
    include: { supplier: true, items: true, requisition: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { supplierId, requisitionId, items, deliveryDate, terms } = body;

  if (!supplierId || !items?.length) {
    return NextResponse.json({ error: "Supplier and items are required" }, { status: 400 });
  }

  const count = await db.purchaseOrder.count();
  const poNumber = generatePONumber(count);

  const totalAmount = items.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  const po = await db.purchaseOrder.create({
    data: {
      poNumber,
      supplierId,
      requisitionId: requisitionId ?? null,
      issuedBy: user.id,
      issuedByName: user.name,
      totalAmount,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      terms,
      items: {
        create: items.map((item: {
          itemName: string;
          description?: string;
          quantity: number;
          unit?: string;
          unitPrice: number;
        }) => ({
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit ?? "pcs",
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { supplier: true, items: true },
  });

  // Update PR status if linked
  if (requisitionId) {
    await db.purchaseRequisition.update({
      where: { id: requisitionId },
      data: { status: "CONVERTED" },
    });
  }

  return NextResponse.json(po, { status: 201 });
}
