import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(employee);
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const body = await req.json();
    const moduleAccess = Array.isArray(body.moduleAccess)
      ? body.moduleAccess.filter((item: unknown) => typeof item === "string" && item.trim())
      : undefined;
    const employee = await db.employee.update({
      where: { id },
      data: {
        procurementRole: typeof body.procurementRole === "string" ? body.procurementRole : null,
        ...(moduleAccess ? { moduleAccess: JSON.stringify(moduleAccess) } : {}),
      },
    });
    return NextResponse.json(employee);
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
