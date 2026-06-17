import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";

const HRMS_BASE = (process.env.HRMS_API_URL ?? "https://hrms.vahmaafushi.com").replace(/\/api$/, "");

type UnknownRecord = Record<string, unknown>;

function extractCookies(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get("set-cookie");
  return raw ? raw.split(/,(?=\s*[^;,\s]+=)/).map((cookie) => cookie.trim()) : [];
}

function cookiesToHeader(cookieStrings: string[]): string {
  return cookieStrings.map((cookie) => cookie.split(";")[0].trim()).filter(Boolean).join("; ");
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function pickText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);

    const record = asRecord(value);
    const nested = [
      record.name,
      record.fullName,
      record.title,
      record.code,
      record.employeeCode,
      record.id,
    ].find((item) => (typeof item === "string" && item.trim()) || typeof item === "number");
    if (typeof nested === "string" && nested.trim()) return nested.trim();
    if (typeof nested === "number") return String(nested);
  }
  return undefined;
}

function pickRecord(...values: unknown[]): UnknownRecord {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length > 0) return record;
  }
  return {};
}

function normalizeRoles(...values: unknown[]): string[] {
  const roles = new Set<string>();

  function addRole(value: unknown) {
    if (typeof value === "string") {
      value
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean)
        .forEach((role) => roles.add(role));
      return;
    }
    if (typeof value === "number") {
      roles.add(String(value));
      return;
    }

    const role = pickText(value);
    if (role) roles.add(role);
  }

  for (const value of values) {
    if (Array.isArray(value)) {
      value.forEach(addRole);
    } else {
      addRole(value);
    }
  }

  return [...roles];
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim()) : [];
  } catch {
    return [];
  }
}

function hasHrmsRole(roles: string[], role: string) {
  return roles.some((item) => item.trim().toUpperCase() === role);
}

function roleFromEmployee(employee: { procurementRole: string | null; hrmsRoles: string | null }) {
  const roles = parseJsonArray(employee.hrmsRoles);
  return hasHrmsRole(roles, "ADMIN") ? "ADMIN" : employee.procurementRole ?? "REQUESTER";
}

async function fetchHrmsProfile(baseUrl: string, cookieHeader: string, hrmsUser: UnknownRecord) {
  const employeeId = pickText(hrmsUser.employeeId, hrmsUser.employeeCode, hrmsUser.id);
  const endpoints = [
    "/api/employees/me",
    "/api/employee/me",
    "/api/profile",
    "/api/me",
    employeeId ? `/api/employees/${encodeURIComponent(employeeId)}` : "",
  ].filter(Boolean);

  for (const endpoint of endpoints) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: { Accept: "application/json", Cookie: cookieHeader },
    }).catch(() => null);
    if (!res?.ok) continue;

    const payload = await res.json().catch(() => ({}));
    const payloadRecord = asRecord(payload);
    const profile = pickRecord(payloadRecord.data, payloadRecord.employee, payloadRecord.user, payload);
    if (Object.keys(profile).length > 0) return profile;
  }

  return {};
}

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const csrfRes = await fetch(`${HRMS_BASE}/api/auth/csrf`, { headers: { Accept: "application/json" } });
    if (!csrfRes.ok) return NextResponse.json({ error: "Could not reach HRMS server" }, { status: 502 });

    const { csrfToken } = await csrfRes.json();
    const csrfCookies = extractCookies(csrfRes.headers);

    const formBody = new URLSearchParams({
      csrfToken,
      email,
      password,
      redirect: "false",
      json: "true",
      callbackUrl: HRMS_BASE,
    });
    const signInRes = await fetch(`${HRMS_BASE}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "X-Auth-Return-Redirect": "1",
        Cookie: cookiesToHeader(csrfCookies),
        Origin: HRMS_BASE,
        Referer: `${HRMS_BASE}/login`,
      },
      body: formBody.toString(),
      redirect: "manual",
    });

    const signInCookies = extractCookies(signInRes.headers);
    const allCookies = cookiesToHeader([...csrfCookies, ...signInCookies]);

    let resultUrl = "";
    try {
      resultUrl = (await signInRes.json())?.url ?? "";
    } catch {
      /* redirect response */
    }
    const location = signInRes.headers.get("location") ?? "";
    if (!resultUrl) resultUrl = location;

    if (resultUrl.includes("error=") || (!resultUrl && signInRes.status >= 400)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const sessionRes = await fetch(`${HRMS_BASE}/api/auth/session`, {
      headers: { Accept: "application/json", Cookie: allCookies },
    });
    const sessionData = await sessionRes.json().catch(() => ({}));
    const hrmsUser = asRecord(asRecord(sessionData).user);

    if (!pickText(hrmsUser.email)) {
      return NextResponse.json({ error: "Login failed - could not retrieve user" }, { status: 401 });
    }

    const profile = await fetchHrmsProfile(HRMS_BASE, allCookies, hrmsUser);
    const manager = pickRecord(
      profile.reportingManager,
      profile.manager,
      profile.supervisor,
      hrmsUser.reportingManager,
      hrmsUser.manager,
      hrmsUser.supervisor
    );
    const departmentManager = pickRecord(
      profile.departmentManager,
      profile.departmentHead,
      profile.department_head,
      profile.deptManager,
      hrmsUser.departmentManager,
      hrmsUser.departmentHead,
      hrmsUser.department_head,
      hrmsUser.deptManager
    );
    const company = pickRecord(profile.company, hrmsUser.company);
    const unit = pickRecord(profile.unit, profile.businessUnit, hrmsUser.unit, hrmsUser.businessUnit);
    const workLocation = pickRecord(
      profile.workLocation,
      profile.work_location,
      profile.location,
      profile.locationName,
      profile.branch,
      profile.site,
      profile.employeeLocation,
      profile.workSite,
      hrmsUser.workLocation,
      hrmsUser.work_location,
      hrmsUser.location,
      hrmsUser.locationName,
      hrmsUser.branch,
      hrmsUser.site,
      hrmsUser.employeeLocation,
      hrmsUser.workSite
    );
    const hrmsRoles = normalizeRoles(
      profile.roles,
      profile.role,
      profile.userRoles,
      profile.permissions,
      hrmsUser.roles,
      hrmsUser.role,
      hrmsUser.userRoles,
      hrmsUser.permissions
    );

    const hrmsId = pickText(profile.hrmsId, profile.employeeId, profile.id, hrmsUser.id, hrmsUser.employeeId, hrmsUser.email) ?? email;
    const officialWorkEmail = pickText(
      profile.workEmail,
      profile.work_email,
      profile.officialEmail,
      profile.official_email,
      profile.companyEmail,
      profile.company_email,
      profile.businessEmail,
      profile.business_email,
      profile.corporateEmail,
      profile.corporate_email,
      profile.emailWork,
      profile.email_work,
      hrmsUser.workEmail,
      hrmsUser.work_email,
      hrmsUser.officialEmail,
      hrmsUser.official_email,
      hrmsUser.companyEmail,
      hrmsUser.company_email,
      hrmsUser.businessEmail,
      hrmsUser.business_email,
      hrmsUser.corporateEmail,
      hrmsUser.corporate_email,
      hrmsUser.emailWork,
      hrmsUser.email_work
    );
    const employeeData = {
      hrmsId,
      employeeCode: pickText(profile.employeeCode, profile.code, profile.staffCode, profile.empCode, hrmsUser.employeeCode, hrmsUser.employeeId),
      name: pickText(profile.name, profile.fullName, profile.employeeName, hrmsUser.name, hrmsUser.fullName) ?? email.split("@")[0],
      email: officialWorkEmail ?? `${hrmsId}@no-work-email.local`,
      workEmail: officialWorkEmail,
      companyId: pickText(profile.companyId, profile.companyID, profile.company_id, profile.companyCode, company.id, company.code, company.companyId, hrmsUser.companyId, hrmsUser.companyID, hrmsUser.company_id),
      companyName: pickText(profile.companyName, profile.company_name, company.name, company.fullName, company.title, hrmsUser.companyName, hrmsUser.company_name),
      department: pickText(profile.department, profile.departmentName, hrmsUser.department, hrmsUser.departmentName),
      section: pickText(profile.section, profile.sectionName, hrmsUser.section, hrmsUser.sectionName),
      designation: pickText(profile.designation, profile.designationName, profile.position, profile.jobTitle, hrmsUser.designation, hrmsUser.position, hrmsUser.role),
      workLocation: pickText(profile.workLocationName, profile.work_location_name, profile.locationName, profile.branchName, profile.siteName, workLocation.name, workLocation.fullName, workLocation.title, workLocation.code, profile.workLocation, profile.work_location, profile.location, profile.branch, profile.site, hrmsUser.workLocationName, hrmsUser.locationName),
      unit: pickText(profile.unit, profile.unitName, profile.workUnit, profile.businessUnit, unit.name, unit.code, unit.id, hrmsUser.unit, hrmsUser.unitName, hrmsUser.workUnit, hrmsUser.businessUnit),
      reportingManagerId: pickText(profile.reportingManagerId, profile.managerId, profile.supervisorId, manager.employeeId, manager.id, manager.hrmsId),
      reportingManagerName: pickText(profile.reportingManagerName, profile.managerName, profile.supervisorName, manager.name, manager.fullName),
      departmentManagerId: pickText(profile.departmentManagerId, profile.departmentHeadId, profile.deptManagerId, departmentManager.employeeId, departmentManager.id, departmentManager.hrmsId),
      departmentManagerName: pickText(profile.departmentManagerName, profile.departmentHeadName, profile.deptManagerName, departmentManager.name, departmentManager.fullName),
      hrmsRoles: hrmsRoles.length > 0 ? JSON.stringify(hrmsRoles) : undefined,
      employmentStatus: (pickText(profile.employmentStatus, profile.status, hrmsUser.employmentStatus, hrmsUser.status) ?? "ACTIVE").toUpperCase(),
      lastSyncedAt: new Date(),
    };

    const existingEmployee = await db.employee.findFirst({
      where: {
        OR: [
          { hrmsId },
          { email: employeeData.email },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    const employee = existingEmployee
      ? await db.employee.update({
          where: { id: existingEmployee.id },
          data: employeeData,
        })
      : await db.employee.create({ data: employeeData });

    if (employee.employmentStatus !== "ACTIVE") {
      return NextResponse.json({ error: "Your account is inactive. Please contact HR." }, { status: 403 });
    }

    const employeeHrmsRoles = parseJsonArray(employee.hrmsRoles);
    const fallbackRole = roleFromEmployee(employee);
    const fallbackModules = parseJsonArray(employee.moduleAccess);

    let activeAccess:
      | {
          role: string;
          moduleAccess: string | null;
          company: { id: string; name: string; hrmsCompanyId: string };
          project: { id: string; name: string } | null;
        }
      | null = null;
    let contexts: Array<{
      companyId: string;
      companyName: string;
      hrmsCompanyId: string;
      projectId?: string;
      projectName?: string;
      role: string;
      moduleAccess: string[];
    }> = [];

    if (employee.companyId) {
      const company = await db.procurementCompany.upsert({
        where: { hrmsCompanyId: employee.companyId },
        update: { name: employee.companyName ?? employee.companyId, code: employee.companyId, isActive: true },
        create: { hrmsCompanyId: employee.companyId, name: employee.companyName ?? employee.companyId, code: employee.companyId },
      });

      const existingAccess = await db.procurementAccess.findFirst({
        where: { employeeId: employee.id, companyId: company.id, projectId: null },
      });
      if (!existingAccess) {
        await db.procurementAccess.create({
          data: {
            employeeId: employee.id,
            companyId: company.id,
            role: fallbackRole,
            moduleAccess: fallbackModules.length > 0 ? JSON.stringify(fallbackModules) : null,
          },
        });
      }
    }

    const accessRows = await db.procurementAccess.findMany({
      where: { employeeId: employee.id, isActive: true, company: { isActive: true } },
      include: { company: true, project: true },
      orderBy: { createdAt: "asc" },
    });

    contexts = accessRows.map((access) => ({
      companyId: access.company.id,
      companyName: access.company.name,
      hrmsCompanyId: access.company.hrmsCompanyId,
      projectId: access.project?.id,
      projectName: access.project?.name,
      role: access.role,
      moduleAccess: parseJsonArray(access.moduleAccess),
    }));

    activeAccess = accessRows.find((access) => access.company.hrmsCompanyId === employee.companyId && !access.projectId) ?? accessRows[0] ?? null;
    const procurementRole = activeAccess?.role ?? fallbackRole;
    const procurementModules = activeAccess ? parseJsonArray(activeAccess.moduleAccess) : fallbackModules;

    await createSession({
      id: employee.id,
      hrmsId: employee.hrmsId,
      name: employee.name,
      email: employee.email,
      companyId: employee.companyId ?? undefined,
      companyName: employee.companyName ?? undefined,
      activeCompanyId: activeAccess?.company.id,
      activeCompanyName: activeAccess?.company.name,
      activeProjectId: activeAccess?.project?.id,
      activeProjectName: activeAccess?.project?.name,
      contexts,
      department: employee.department ?? undefined,
      section: employee.section ?? undefined,
      designation: employee.designation ?? undefined,
      workLocation: employee.workLocation ?? undefined,
      unit: employee.unit ?? undefined,
      reportingManagerId: employee.reportingManagerId ?? undefined,
      reportingManagerName: employee.reportingManagerName ?? undefined,
      departmentManagerId: employee.departmentManagerId ?? undefined,
      departmentManagerName: employee.departmentManagerName ?? undefined,
      hrmsRoles: employeeHrmsRoles,
      employmentStatus: employee.employmentStatus,
      procurementRole: employee.procurementRole ?? undefined,
      moduleAccess: procurementModules,
      role: procurementRole,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("HRMS auth error:", err);
    return NextResponse.json({ error: "Could not reach HRMS server" }, { status: 502 });
  }
}
