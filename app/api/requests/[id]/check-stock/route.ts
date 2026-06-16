import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "STOREKEEPER", "PROCUREMENT"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const request = await db.purchaseRequest.findUnique({
      where: { id },
      include: { items: true, deliveryLocation: true },
    });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const locationId = request.deliveryLocationId;
    let allAvailable = true;
    let anyAvailable = false;

    for (const item of request.items) {
      if (!item.itemId) {
        await db.requestItem.update({ where: { id: item.id }, data: { stockChecked: true, availableStock: 0, stockAction: "PURCHASE" } });
        allAvailable = false;
        continue;
      }

      const stock = locationId
        ? await db.stock.findUnique({ where: { itemId_locationId: { itemId: item.itemId, locationId } } })
        : await db.stock.findFirst({ where: { itemId: item.itemId } });

      const available = stock?.quantity ?? 0;
      const isAvailable = available >= item.quantity;
      if (isAvailable) anyAvailable = true;
      else allAvailable = false;

      await db.requestItem.update({
        where: { id: item.id },
        data: {
          availableStock: available,
          stockChecked: true,
          stockAction: isAvailable ? "ISSUE" : "PURCHASE",
        },
      });
    }

    let newStatus: string;
    if (allAvailable) {
      newStatus = "AVAILABLE_IN_STOCK";
    } else if (anyAvailable) {
      newStatus = "CHECKING_STOCK";
    } else {
      newStatus = "PURCHASE_REQUIRED";
    }

    await db.purchaseRequest.update({ where: { id }, data: { status: newStatus } });
    await db.requestStatusHistory.create({
      data: {
        requestId: id,
        status: newStatus,
        comment: "Stock check completed",
        changedBy: session.id,
        changedByName: session.name,
      },
    });

    const updatedItems = await db.requestItem.findMany({ where: { requestId: id } });
    return NextResponse.json({ status: newStatus, items: updatedItems });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
