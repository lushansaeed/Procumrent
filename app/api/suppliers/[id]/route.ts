import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supplier = await db.supplier.findUnique({ where: { id }, include: { purchaseOrders: true } });
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const supplier = await db.supplier.update({ where: { id }, data: body });
  return NextResponse.json(supplier);
}
