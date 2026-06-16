import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const locationId = searchParams.get("locationId");
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const movements = await db.stockMovement.findMany({
      where: {
        ...(itemId ? { itemId } : {}),
        ...(locationId ? { locationId } : {}),
        ...(type ? { movementType: type } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(movements);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
