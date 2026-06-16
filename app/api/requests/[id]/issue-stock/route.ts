import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { adjustStock } from "@/lib/stock";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "STOREKEEPER" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { locationId, items } = body as {
      locationId: string;
      items: Array<{ itemId: string; itemName: string; quantity: number; unit: string }>;
    };

    const request = await db.purchaseRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const location = await db.location.findUnique({ where: { id: locationId } });

    // Generate issue number
    const count = await db.stockIssue.count();
    const year = new Date().getFullYear();
    const issueNumber = `SI-${year}-${String(count + 1).padStart(4, "0")}`;

    const stockIssue = await db.stockIssue.create({
      data: {
        issueNumber,
        requestId: id,
        locationId,
        locationName: location?.name ?? locationId,
        issuedToId: request.requesterId,
        issuedToName: request.requesterName,
        issuedById: session.id,
        issuedByName: session.name,
        status: "ISSUED",
        items: {
          create: items.map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: { items: true },
    });

    // Create stock movements and adjust stock
    for (const item of items) {
      await adjustStock(
        item.itemId,
        locationId,
        "ISSUE",
        item.quantity,
        stockIssue.issueNumber,
        "ISSUE",
        session.id,
        session.name
      );
    }

    await db.purchaseRequest.update({ where: { id }, data: { status: "DELIVERED" } });
    await db.requestStatusHistory.create({
      data: {
        requestId: id,
        status: "DELIVERED",
        comment: `Stock issued: ${issueNumber}`,
        changedBy: session.id,
        changedByName: session.name,
      },
    });

    return NextResponse.json(stockIssue, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
