import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const items = await db.item.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
        ...(search ? { name: { contains: search } } : {}),
      },
      include: {
        category: true,
        stocks: { include: { location: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "STOREKEEPER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const item = await db.item.create({
      data: {
        code: body.code,
        name: body.name,
        categoryId: body.categoryId,
        description: body.description,
        unit: body.unit ?? "pcs",
        isStockable: body.isStockable ?? true,
        isAsset: body.isAsset ?? false,
        isConsumable: body.isConsumable ?? false,
        minStockLevel: body.minStockLevel ?? 0,
        reorderLevel: body.reorderLevel ?? 0,
        estimatedPrice: body.estimatedPrice ?? 0,
        preferredSupplierId: body.preferredSupplierId,
      },
      include: { category: true },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
