import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: true, requisition: { include: { items: true } } },
  });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(po);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const po = await db.purchaseOrder.update({ where: { id }, data: body });
  return NextResponse.json(po);
}
