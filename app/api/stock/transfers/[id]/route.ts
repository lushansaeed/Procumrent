import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { adjustStock } from "@/lib/stock";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const transfer = await db.stockTransfer.findUnique({
      where: { id },
      include: {
        fromLocation: true,
        toLocation: true,
        items: { include: { item: true } },
      },
    });
    if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(transfer);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "STOREKEEPER", "PROCUREMENT"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const transfer = await db.stockTransfer.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: Record<string, unknown> = { status };

    if (status === "IN_TRANSIT") {
      updateData.dispatchedById = session.id;
      updateData.dispatchedByName = session.name;
      updateData.dispatchedAt = new Date();

      for (const item of transfer.items) {
        await adjustStock(
          item.itemId,
          transfer.fromLocationId,
          "TRANSFER_OUT",
          item.requestedQty,
          transfer.transferNumber,
          "TRANSFER",
          session.id,
          session.name
        );
      }
    } else if (status === "RECEIVED") {
      updateData.receivedById = session.id;
      updateData.receivedByName = session.name;
      updateData.receivedAt = new Date();

      for (const item of transfer.items) {
        await adjustStock(
          item.itemId,
          transfer.toLocationId,
          "TRANSFER_IN",
          item.requestedQty,
          transfer.transferNumber,
          "TRANSFER",
          session.id,
          session.name
        );
        await db.stockTransferItem.update({
          where: { id: item.id },
          data: { receivedQty: item.requestedQty, sentQty: item.requestedQty },
        });
      }
    }

    const updated = await db.stockTransfer.update({
      where: { id },
      data: updateData,
      include: { fromLocation: true, toLocation: true, items: { include: { item: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
