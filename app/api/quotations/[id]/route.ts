import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const q = await db.quotation.findUnique({ where: { id }, include: { supplier: true, items: true, request: true } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(q);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN","PROCUREMENT"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  if (body.isSelected === true) {
    const quotation = await db.quotation.findUnique({ where: { id } });
    if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.quotation.updateMany({ where: { requestId: quotation.requestId, id: { not: id } }, data: { status: "REJECTED", isSelected: false } });
    await db.quotation.update({ where: { id }, data: { isSelected: true, status: "SELECTED", selectionReason: body.selectionReason } });
    await db.purchaseRequest.update({
      where: { id: quotation.requestId },
      data: {
        status: "SUPPLIER_SELECTED",
        statusHistory: {
          create: {
            status: "SUPPLIER_SELECTED",
            changedBy: user.id,
            changedByName: user.name,
            comment: body.selectionReason ? `Quotation selected: ${body.selectionReason}` : "Quotation selected.",
          },
        },
      },
    });
    return NextResponse.json({ ok: true });
  }
  const updated = await db.quotation.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}
