import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const pr = await db.purchaseRequisition.findUnique({
    where: { id },
    include: { items: true, approvals: true, purchaseOrder: { include: { supplier: true } } },
  });

  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pr);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const pr = await db.purchaseRequisition.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(pr);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.purchaseRequisition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
