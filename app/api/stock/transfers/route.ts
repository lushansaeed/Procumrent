import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const transfers = await db.stockTransfer.findMany({
      include: {
        fromLocation: true,
        toLocation: true,
        items: { include: { item: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(transfers);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "STOREKEEPER", "PROCUREMENT"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const year = new Date().getFullYear();
    const count = await db.stockTransfer.count();
    const transferNumber = `ST-${year}-${String(count + 1).padStart(4, "0")}`;

    const transfer = await db.stockTransfer.create({
      data: {
        transferNumber,
        fromLocationId: body.fromLocationId,
        toLocationId: body.toLocationId,
        requestedById: session.id,
        requestedByName: session.name,
        remarks: body.remarks,
        status: "PENDING_APPROVAL",
        items: {
          create: (body.items ?? []).map((item: { itemId: string; itemName: string; unit: string; requestedQty: number }) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            unit: item.unit,
            requestedQty: item.requestedQty,
          })),
        },
      },
      include: { fromLocation: true, toLocation: true, items: { include: { item: true } } },
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
