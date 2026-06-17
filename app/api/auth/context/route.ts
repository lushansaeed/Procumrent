import { NextRequest, NextResponse } from "next/server";
import { createSession, getSession } from "@/lib/auth";
import { db } from "@/lib/db";

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim()) : [];
  } catch {
    return [];
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const companyId = typeof body.companyId === "string" ? body.companyId : "";
  const projectId = typeof body.projectId === "string" && body.projectId ? body.projectId : null;
  if (!companyId) return NextResponse.json({ error: "Company is required" }, { status: 400 });

  const access = await db.procurementAccess.findFirst({
    where: {
      employeeId: user.id,
      companyId,
      projectId,
      isActive: true,
      company: { isActive: true },
      ...(projectId ? { project: { isActive: true } } : {}),
    },
    include: { company: true, project: true },
  });

  if (!access) return NextResponse.json({ error: "You do not have access to this company or project" }, { status: 403 });

  const accessRows = await db.procurementAccess.findMany({
    where: { employeeId: user.id, isActive: true, company: { isActive: true } },
    include: { company: true, project: true },
    orderBy: { createdAt: "asc" },
  });

  const contexts = accessRows.map((row) => ({
    companyId: row.company.id,
    companyName: row.company.name,
    hrmsCompanyId: row.company.hrmsCompanyId,
    projectId: row.project?.id,
    projectName: row.project?.name,
    role: row.role,
    moduleAccess: parseJsonArray(row.moduleAccess),
  }));

  await createSession({
    ...user,
    activeCompanyId: access.company.id,
    activeCompanyName: access.company.name,
    activeProjectId: access.project?.id,
    activeProjectName: access.project?.name,
    contexts,
    role: access.role,
    moduleAccess: parseJsonArray(access.moduleAccess),
  });

  return NextResponse.json({ ok: true });
}
