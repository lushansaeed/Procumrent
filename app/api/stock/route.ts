import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const itemId = searchParams.get("itemId");
    const lowStock = searchParams.get("lowStock") === "true";

    const stocks = await db.stock.findMany({
      where: {
        ...(locationId ? { locationId } : {}),
        ...(itemId ? { itemId } : {}),
      },
      include: {
        item: { include: { category: true } },
        location: true,
      },
      orderBy: { item: { name: "asc" } },
    });

    const result = lowStock
      ? stocks.filter((s) => s.quantity <= s.item.reorderLevel)
      : stocks;

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
