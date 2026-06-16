import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const grns = await db.goodsReceivedNote.findMany({
      include: {
        po: { select: { id: true, poNumber: true, supplier: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(grns);
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
    const count = await db.goodsReceivedNote.count();
    const grnNumber = `GRN-${year}-${String(count + 1).padStart(4, "0")}`;

    const grn = await db.goodsReceivedNote.create({
      data: {
        grnNumber,
        poId: body.poId,
        receivedAt: body.receivedAt ?? new Date().toISOString(),
        receivedById: session.id,
        receivedByName: session.name,
        deliveryNote: body.deliveryNote ?? null,
        invoiceNumber: body.invoiceNumber ?? null,
        status: "DRAFT",
        remarks: body.remarks ?? null,
        items: {
          create: (body.items ?? []).map((item: {
            poItemId?: string;
            itemId?: string;
            itemName: string;
            orderedQty: number;
            receivedQty: number;
            rejectedQty?: number;
            condition?: string;
            remarks?: string;
          }) => ({
            poItemId: item.poItemId ?? null,
            itemId: item.itemId ?? null,
            itemName: item.itemName,
            orderedQty: item.orderedQty,
            receivedQty: item.receivedQty,
            rejectedQty: item.rejectedQty ?? 0,
            condition: item.condition ?? "GOOD",
            remarks: item.remarks ?? null,
          })),
        },
      },
      include: { items: true, po: true },
    });

    return NextResponse.json(grn, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
