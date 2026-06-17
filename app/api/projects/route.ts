import { NextRequest, NextResponse } from "next/server";
import { MODULES, getSession, hasModuleAccess } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.procurementProject.findMany({
    include: { company: true },
    orderBy: [{ companyId: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(user, MODULES.SETTINGS)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const companyId = typeof body.companyId === "string" ? body.companyId : "";
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!companyId || !code || !name) return NextResponse.json({ error: "Company, code, and name are required" }, { status: 400 });

  const project = await db.procurementProject.create({
    data: { companyId, code, name },
  });
  return NextResponse.json(project, { status: 201 });
}
