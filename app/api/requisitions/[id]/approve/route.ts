import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status, comments } = await request.json();

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Status must be APPROVED or REJECTED" }, { status: 400 });
  }

  const [approval] = await db.$transaction([
    db.approval.create({
      data: {
        requisitionId: id,
        approverId: user.id,
        approverName: user.name,
        status,
        comments,
      },
    }),
    db.purchaseRequisition.update({
      where: { id },
      data: { status },
    }),
  ]);

  return NextResponse.json(approval);
}
