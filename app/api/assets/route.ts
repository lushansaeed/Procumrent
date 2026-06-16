import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const department = searchParams.get("department");
    const locationId = searchParams.get("locationId");
    const assets = await db.asset.findMany({
      where: { ...(status ? { status } : {}), ...(department ? { department } : {}), ...(locationId ? { locationId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assets);
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN","STOREKEEPER","PROCUREMENT"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const asset = await db.asset.create({
      data: {
        assetCode: body.assetCode, name: body.name, categoryId: body.categoryId ?? null, serialNumber: body.serialNumber ?? null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null, purchasePrice: body.purchasePrice ?? 0,
        supplierId: body.supplierId ?? null, warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        assignedToId: body.assignedToId ?? null, assignedToName: body.assignedToName ?? null,
        department: body.department ?? null, locationId: body.locationId ?? null,
        condition: body.condition ?? "GOOD", status: body.status ?? "IN_STORE", notes: body.notes ?? null, poId: body.poId ?? null,
      },
    });
    return NextResponse.json(asset, { status: 201 });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
