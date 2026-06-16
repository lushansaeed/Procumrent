import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { adjustStock } from "@/lib/stock";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const grns = await db.goodsReceivedNote.findMany({
      include: { po: { select: { id: true, poNumber: true, supplier: true } }, items: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(grns);
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN","STOREKEEPER","PROCUREMENT"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const year = new Date().getFullYear();
    const count = await db.goodsReceivedNote.count();
    const grnNumber = `GRN-${year}-${String(count + 1).padStart(4, "0")}`;
    const grnStatus = body.status ?? "CONFIRMED";
    const grn = await db.goodsReceivedNote.create({
      data: {
        grnNumber, poId: body.poId, receivedAt: body.receivedAt ?? new Date().toISOString(),
        receivedById: session.id, receivedByName: session.name,
        deliveryNote: body.deliveryNote ?? null, invoiceNumber: body.invoiceNumber ?? null,
        status: grnStatus, remarks: body.remarks ?? null,
        items: { create: (body.items ?? []).map((item: { poItemId?: string; itemId?: string; itemName: string; orderedQty: number; receivedQty: number; rejectedQty?: number; condition?: string; remarks?: string; }) => ({ poItemId: item.poItemId ?? null, itemId: item.itemId ?? null, itemName: item.itemName, orderedQty: item.orderedQty, receivedQty: item.receivedQty, rejectedQty: item.rejectedQty ?? 0, condition: item.condition ?? "GOOD", remarks: item.remarks ?? null })) },
      },
      include: { items: true, po: { include: { items: true } } },
    });
    if (grnStatus === "CONFIRMED") {
      for (const item of grn.items) {
        if (item.poItemId) {
          const currentPoItem = grn.po.items.find((poItem) => poItem.id === item.poItemId);
          await db.pOItem.update({
            where: { id: item.poItemId },
            data: { receivedQty: (currentPoItem?.receivedQty ?? 0) + item.receivedQty },
          });
        }

        if (item.itemId && grn.po.deliveryLocationId && item.receivedQty > 0) {
          await adjustStock(
            item.itemId,
            grn.po.deliveryLocationId,
            "STOCK_IN",
            item.receivedQty,
            grn.grnNumber,
            "GRN",
            session.id,
            session.name,
            "Goods received"
          );
        }
      }

      const refreshedItems = await db.pOItem.findMany({ where: { orderId: grn.poId } });
      const allReceived = refreshedItems.length > 0 && refreshedItems.every((item) => item.receivedQty >= item.quantity);
      const anyReceived = refreshedItems.some((item) => item.receivedQty > 0);
      await db.purchaseOrder.update({
        where: { id: grn.poId },
        data: { status: allReceived ? "FULLY_RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : grn.po.status },
      });

      if (grn.po.requestId) {
        await db.purchaseRequest.update({ where: { id: grn.po.requestId }, data: { status: "GOODS_RECEIVED" } });
        await db.requestStatusHistory.create({
          data: {
            requestId: grn.po.requestId,
            status: "GOODS_RECEIVED",
            comment: `Goods received note ${grn.grnNumber} confirmed`,
            changedBy: session.id,
            changedByName: session.name,
          },
        });
      }
    }
    return NextResponse.json(grn, { status: 201 });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
