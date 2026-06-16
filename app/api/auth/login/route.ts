import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";

const HRMS_BASE = (process.env.HRMS_API_URL ?? "https://hrms.vahmaafushi.com").replace(/\/api$/, "");

type UnknownRecord = Record<string, unknown>;

function extractCookies(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get("set-cookie");
  return raw ? raw.split(/,(?=[^ ])/) : [];
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
    const nested = pickText(record.name, record.fullName, record.title, record.code, record.employeeCode, record.id);
    if (nested) return nested;
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

    const hrmsId = pickText(profile.hrmsId, profile.employeeId, profile.id, hrmsUser.id, hrmsUser.employeeId, hrmsUser.email) ?? email;
    const employeeData = {
      hrmsId,
      employeeCode: pickText(profile.employeeCode, profile.code, profile.staffCode, profile.empCode, hrmsUser.employeeCode, hrmsUser.employeeId),
      name: pickText(profile.name, profile.fullName, profile.employeeName, hrmsUser.name, hrmsUser.fullName) ?? email.split("@")[0],
      email: pickText(profile.email, hrmsUser.email) ?? email,
      department: pickText(profile.department, profile.departmentName, hrmsUser.department, hrmsUser.departmentName),
      section: pickText(profile.section, profile.sectionName, hrmsUser.section, hrmsUser.sectionName),
      designation: pickText(profile.designation, profile.designationName, profile.position, profile.jobTitle, hrmsUser.designation, hrmsUser.position, hrmsUser.role),
      workLocation: pickText(profile.workLocation, profile.location, profile.locationName, profile.branch, profile.site, hrmsUser.workLocation, hrmsUser.location, hrmsUser.locationName),
      reportingManagerId: pickText(profile.reportingManagerId, profile.managerId, profile.supervisorId, manager.employeeId, manager.id, manager.hrmsId),
      reportingManagerName: pickText(profile.reportingManagerName, profile.managerName, profile.supervisorName, manager.name, manager.fullName),
      employmentStatus: (pickText(profile.employmentStatus, profile.status, hrmsUser.employmentStatus, hrmsUser.status) ?? "ACTIVE").toUpperCase(),
      lastSyncedAt: new Date(),
    };

    const employee = await db.employee.upsert({
      where: { hrmsId },
      update: employeeData,
      create: employeeData,
    });

    if (employee.employmentStatus !== "ACTIVE") {
      return NextResponse.json({ error: "Your account is inactive. Please contact HR." }, { status: 403 });
    }

    const procurementRole = employee.procurementRole ?? "REQUESTER";

    await createSession({
      id: employee.id,
      hrmsId: employee.hrmsId,
      name: employee.name,
      email: employee.email,
      department: employee.department ?? undefined,
      section: employee.section ?? undefined,
      designation: employee.designation ?? undefined,
      workLocation: employee.workLocation ?? undefined,
      reportingManagerId: employee.reportingManagerId ?? undefined,
      reportingManagerName: employee.reportingManagerName ?? undefined,
      employmentStatus: employee.employmentStatus,
      procurementRole: employee.procurementRole ?? undefined,
      role: procurementRole,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("HRMS auth error:", err);
    return NextResponse.json({ error: "Could not reach HRMS server" }, { status: 502 });
  }
}
