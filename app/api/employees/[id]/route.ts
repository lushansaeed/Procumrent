import { NextRequest, NextResponse } from "next/server";
import { MODULES, getSession, hasModuleAccess } from "@/lib/auth";
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
  if (!hasModuleAccess(session, MODULES.SETTINGS)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const body = await req.json();
    const moduleAccess = Array.isArray(body.moduleAccess)
      ? body.moduleAccess.filter((item: unknown) => typeof item === "string" && item.trim())
      : undefined;
    const role = typeof body.procurementRole === "string" ? body.procurementRole : "REQUESTER";
    const companyId = typeof body.companyId === "string" ? body.companyId : "";
    const projectId = typeof body.projectId === "string" && body.projectId ? body.projectId : null;

    if (companyId) {
      const existingAccess = await db.procurementAccess.findFirst({
        where: { employeeId: id, companyId, projectId },
      });
      if (existingAccess) {
        await db.procurementAccess.update({
          where: { id: existingAccess.id },
          data: {
            role,
            moduleAccess: moduleAccess ? JSON.stringify(moduleAccess) : null,
            isActive: true,
          },
        });
      } else {
        await db.procurementAccess.create({
          data: {
            employeeId: id,
            companyId,
            projectId,
            role,
            moduleAccess: moduleAccess ? JSON.stringify(moduleAccess) : null,
          },
        });
      }
    }

    const employee = await db.employee.update({
      where: { id },
      data: {
        procurementRole: role,
        ...(moduleAccess ? { moduleAccess: JSON.stringify(moduleAccess) } : {}),
      },
    });
    return NextResponse.json(employee);
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
