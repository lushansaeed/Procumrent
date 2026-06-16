import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const confirmations = await db.deliveryConfirmation.findMany({
    include: {
      request: { select: { requestNumber: true, requesterName: true, status: true } },
      items: true,
    },
    orderBy: { confirmedAt: "desc" },
  });

  return NextResponse.json(confirmations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "STOREKEEPER", "PROCUREMENT", "MANAGER", "DEPARTMENT_HEAD", "REQUESTER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.requestId || !body.locationId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Request, location, and items are required" }, { status: 400 });
    }

    const [request, location] = await Promise.all([
      db.purchaseRequest.findUnique({ where: { id: body.requestId } }),
      db.location.findUnique({ where: { id: body.locationId } }),
    ]);
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const count = await db.deliveryConfirmation.count();
    const year = new Date().getFullYear();
    const confirmationNumber = `DC-${year}-${String(count + 1).padStart(4, "0")}`;
    const condition = body.condition ?? "GOOD";
    const completed = condition === "GOOD" && body.items.every((item: { sentQty: number; receivedQty: number }) => Number(item.receivedQty) >= Number(item.sentQty));

    const confirmation = await db.deliveryConfirmation.create({
      data: {
        confirmationNumber,
        requestId: body.requestId,
        poNumber: body.poNumber ?? null,
        locationId: body.locationId,
        locationName: location?.name ?? body.locationName ?? body.locationId,
        receivedById: session.id,
        receivedByName: session.name,
        condition,
        remarks: body.remarks ?? null,
        items: {
          create: body.items.map((item: { itemName: string; sentQty: number; receivedQty: number; condition?: string }) => ({
            itemName: item.itemName,
            sentQty: Number(item.sentQty),
            receivedQty: Number(item.receivedQty),
            condition: item.condition ?? condition,
          })),
        },
      },
      include: { items: true, request: true },
    });

    const newStatus = completed ? "COMPLETED" : "PARTIALLY_DELIVERED";
    await db.purchaseRequest.update({ where: { id: body.requestId }, data: { status: newStatus } });
    await db.requestStatusHistory.create({
      data: {
        requestId: body.requestId,
        status: newStatus,
        comment: `Delivery confirmed: ${confirmationNumber}`,
        changedBy: session.id,
        changedByName: session.name,
      },
    });

    return NextResponse.json(confirmation, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
