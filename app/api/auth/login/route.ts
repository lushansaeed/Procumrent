import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";

const HRMS_BASE = (process.env.HRMS_API_URL ?? "https://hrms.vahmaafushi.com").replace(/\/api$/, "");

function extractCookies(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get("set-cookie");
  return raw ? raw.split(/,(?=[^ ])/) : [];
}

function cookiesToHeader(cookieStrings: string[]): string {
  return cookieStrings.map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");
}

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  try {
    const csrfRes = await fetch(`${HRMS_BASE}/api/auth/csrf`, { headers: { Accept: "application/json" } });
    if (!csrfRes.ok) return NextResponse.json({ error: "Could not reach HRMS server" }, { status: 502 });

    const { csrfToken } = await csrfRes.json();
    const csrfCookies = extractCookies(csrfRes.headers);

    const formBody = new URLSearchParams({ csrfToken, email, password, redirect: "false", json: "true", callbackUrl: HRMS_BASE });
    const signInRes = await fetch(`${HRMS_BASE}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", Cookie: cookiesToHeader(csrfCookies), Origin: HRMS_BASE, Referer: `${HRMS_BASE}/login` },
      body: formBody.toString(),
      redirect: "manual",
    });

    const signInCookies = extractCookies(signInRes.headers);
    const allCookies = cookiesToHeader([...csrfCookies, ...signInCookies]);

    let resultUrl = "";
    try { resultUrl = (await signInRes.json())?.url ?? ""; } catch { /* redirect response */ }
    const location = signInRes.headers.get("location") ?? "";
    if (!resultUrl) resultUrl = location;

    if (resultUrl.includes("error=") || (!resultUrl && signInRes.status >= 400))
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const sessionRes = await fetch(`${HRMS_BASE}/api/auth/session`, { headers: { Accept: "application/json", Cookie: allCookies } });
    const sessionData = await sessionRes.json().catch(() => ({}));
    const hrmsUser = sessionData?.user ?? null;

    if (!hrmsUser?.email) return NextResponse.json({ error: "Login failed — could not retrieve user" }, { status: 401 });

    let profile: Record<string, string> = {};
    const profileRes = await fetch(`${HRMS_BASE}/api/employees/me`, { headers: { Accept: "application/json", Cookie: allCookies } }).catch(() => null);
    if (profileRes?.ok) { const pd = await profileRes.json().catch(() => ({})); profile = pd?.data ?? pd?.employee ?? pd ?? {}; }

    const hrmsId = String(hrmsUser.id ?? hrmsUser.employeeId ?? hrmsUser.email);
    const employeeData = {
      hrmsId,
      employeeCode: profile.employeeCode ?? profile.code ?? hrmsUser.employeeId ?? undefined,
      name: hrmsUser.name ?? profile.name ?? email.split("@")[0],
      email: hrmsUser.email,
      department: profile.department ?? hrmsUser.department ?? undefined,
      section: profile.section ?? undefined,
      designation: profile.designation ?? profile.position ?? hrmsUser.role ?? undefined,
      workLocation: profile.workLocation ?? profile.location ?? undefined,
      reportingManagerId: profile.reportingManagerId ?? undefined,
      reportingManagerName: profile.reportingManagerName ?? profile.reportingManager ?? undefined,
      employmentStatus: profile.employmentStatus ?? hrmsUser.employmentStatus ?? "ACTIVE",
      lastSyncedAt: new Date(),
    };

    const employee = await db.employee.upsert({ where: { hrmsId }, update: employeeData, create: employeeData });

    if (employee.employmentStatus !== "ACTIVE")
      return NextResponse.json({ error: "Your account is inactive. Please contact HR." }, { status: 403 });

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
