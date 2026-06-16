import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

const HRMS_BASE = process.env.HRMS_API_URL ?? "https://hrms.vahmaafushi.com";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    // Step 1: get CSRF token from HRMS NextAuth
    const csrfRes = await fetch(`${HRMS_BASE}/api/auth/csrf`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!csrfRes.ok) {
      return NextResponse.json({ error: "Could not reach HRMS server" }, { status: 502 });
    }

    const { csrfToken } = await csrfRes.json();
    const cookies = csrfRes.headers.get("set-cookie") ?? "";

    // Step 2: POST credentials to NextAuth callback endpoint
    const body = new URLSearchParams({
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
        Cookie: cookies,
      },
      body: body.toString(),
      redirect: "manual",
    });

    // NextAuth returns a URL — error means failure
    const result = await signInRes.json().catch(() => null);
    const redirectUrl: string = result?.url ?? "";

    if (redirectUrl.includes("error=")) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Step 3: fetch session to get user info
    const sessionCookies = [cookies, signInRes.headers.get("set-cookie") ?? ""]
      .filter(Boolean)
      .join("; ");

    const sessionRes = await fetch(`${HRMS_BASE}/api/auth/session`, {
      headers: { Cookie: sessionCookies },
    });

    const session = await sessionRes.json().catch(() => ({}));
    const user = session?.user ?? null;

    if (!user?.email) {
      return NextResponse.json({ error: "Login failed — could not retrieve user" }, { status: 401 });
    }

    await createSession({
      id: user.id ?? user.employeeId ?? user.email,
      name: user.name ?? user.email.split("@")[0],
      email: user.email,
      role: user.role ?? user.position ?? "staff",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("HRMS auth error:", err);
    return NextResponse.json({ error: "Could not reach HRMS server" }, { status: 502 });
  }
}
