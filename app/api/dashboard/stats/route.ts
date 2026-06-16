import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfMonth } from "date-fns";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pendingPRs, activePOs, totalSuppliers, monthlySpend] = await Promise.all([
    db.purchaseRequisition.count({ where: { status: "PENDING" } }),
    db.purchaseOrder.count({ where: { status: { in: ["SENT", "ACKNOWLEDGED"] } } }),
    db.supplier.count({ where: { status: "ACTIVE" } }),
    db.purchaseOrder.aggregate({
      where: { createdAt: { gte: startOfMonth(new Date()) } },
      _sum: { totalAmount: true },
    }),
  ]);

  return NextResponse.json({
    pendingPRs,
    activePOs,
    totalSuppliers,
    monthlySpend: monthlySpend._sum.totalAmount ?? 0,
  });
}
