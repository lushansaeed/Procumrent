import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const period = searchParams.get("period");

    const budgets = await db.budget.findMany({
      where: {
        ...(department ? { department } : {}),
        ...(period ? { period } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(budgets);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "FINANCE"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const budget = await db.budget.create({
      data: {
        department: body.department,
        locationId: body.locationId ?? null,
        period: body.period,
        periodType: body.periodType ?? "ANNUAL",
        amount: body.amount,
        usedAmount: 0,
        owner: body.owner ?? null,
        status: "ACTIVE",
      },
    });
    return NextResponse.json(budget, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
