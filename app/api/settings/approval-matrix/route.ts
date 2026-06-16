import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rules = await db.approvalMatrix.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    if (!body.name || !Array.isArray(body.steps) || body.steps.length === 0) {
      return NextResponse.json({ error: "Name and at least one step are required" }, { status: 400 });
    }

    const rule = await db.approvalMatrix.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        conditions: JSON.stringify({
          requestType: body.requestType || undefined,
          priority: body.priority || undefined,
          department: body.department || undefined,
          amountMin: body.amountMin === "" || body.amountMin == null ? undefined : Number(body.amountMin),
          amountMax: body.amountMax === "" || body.amountMax == null ? undefined : Number(body.amountMax),
        }),
        steps: JSON.stringify(
          body.steps.map((step: { role: string; label?: string }) => ({
            role: step.role,
            label: step.label || step.role.replace(/_/g, " "),
            required: true,
          }))
        ),
        sortOrder: Number(body.sortOrder ?? 0),
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
