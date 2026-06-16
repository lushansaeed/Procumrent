import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePRNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const requisitions = await db.purchaseRequisition.findMany({
    where: status ? { status } : undefined,
    include: { items: true, approvals: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requisitions);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, department, priority, items } = body;

  if (!title || !items?.length) {
    return NextResponse.json({ error: "Title and items are required" }, { status: 400 });
  }

  const count = await db.purchaseRequisition.count();
  const prNumber = generatePRNumber(count);

  const totalAmount = items.reduce(
    (sum: number, item: { quantity: number; estimatedPrice: number }) =>
      sum + item.quantity * item.estimatedPrice,
    0
  );

  const pr = await db.purchaseRequisition.create({
    data: {
      prNumber,
      title,
      description,
      department,
      priority: priority ?? "MEDIUM",
      status: "PENDING",
      requestedBy: user.id,
      requestedByName: user.name,
      totalAmount,
      items: {
        create: items.map((item: {
          itemName: string;
          description?: string;
          quantity: number;
          unit: string;
          estimatedPrice: number;
        }) => ({
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit ?? "pcs",
          estimatedPrice: item.estimatedPrice,
          totalPrice: item.quantity * item.estimatedPrice,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(pr, { status: 201 });
}
