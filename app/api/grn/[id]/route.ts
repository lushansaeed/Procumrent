import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { adjustStock } from "@/lib/stock";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const grn = await db.goodsReceivedNote.findUnique({
      where: { id },
      include: {
        po: { include: { supplier: true, items: true } },
        items: { include: { poItem: true } },
      },
    });
    if (!grn) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(grn);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "STOREKEEPER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();

    const grn = await db.goodsReceivedNote.findUnique({
      where: { id },
      include: { items: true, po: true },
    });
    if (!grn) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.status === "CONFIRMED" && grn.status === "DRAFT") {
      const po = await db.purchaseOrder.findUnique({
        where: { id: grn.poId },
        include: { items: true },
      });

      const deliveryLocationId = po?.deliveryLocationId;

      for (const item of grn.items) {
        if (item.itemId && deliveryLocationId && item.receivedQty > 0) {
          await adjustStock(
            item.itemId,
            deliveryLocationId,
            "STOCK_IN",
            item.receivedQty,
            grn.grnNumber,
            "GRN",
            session.id,
            session.name
          );
        }

        // Update PO item received qty
        if (item.poItemId) {
          const poItem = await db.pOItem.findUnique({ where: { id: item.poItemId } });
          if (poItem) {
            await db.pOItem.update({
              where: { id: item.poItemId },
              data: { receivedQty: poItem.receivedQty + item.receivedQty },
            });
          }
        }
      }

      // Update PO status
      if (po) {
        const allPoItems = await db.pOItem.findMany({ where: { orderId: po.id } });
        const allReceived = allPoItems.every((i) => i.receivedQty >= i.quantity);
        const anyReceived = allPoItems.some((i) => i.receivedQty > 0);
        const newPoStatus = allReceived ? "FULLY_RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status;
        await db.purchaseOrder.update({ where: { id: po.id }, data: { status: newPoStatus } });
      }
    }

    const updated = await db.goodsReceivedNote.update({
      where: { id },
      data: { status: body.status },
      include: { items: true, po: { include: { supplier: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
