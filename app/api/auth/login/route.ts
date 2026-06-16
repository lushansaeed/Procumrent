import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

const HRMS_BASE = (process.env.HRMS_API_URL ?? "https://hrms.vahmaafushi.com").replace(/\/api$/, "");

function extractCookies(headers: Headers): string[] {
  // getSetCookie returns each Set-Cookie header separately (Node 18+)
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const raw = headers.get("set-cookie");
  return raw ? raw.split(/,(?=[^ ])/) : [];
}

function cookiesToHeader(cookieStrings: string[]): string {
  // Parse name=value from each Set-Cookie string, join as Cookie header
  return cookieStrings
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    // Step 1: get CSRF token
    const csrfRes = await fetch(`${HRMS_BASE}/api/auth/csrf`, {
      headers: { Accept: "application/json" },
    });

    if (!csrfRes.ok) {
      console.error("CSRF fetch failed:", csrfRes.status, await csrfRes.text());
      return NextResponse.json({ error: "Could not reach HRMS server" }, { status: 502 });
    }

    const { csrfToken } = await csrfRes.json();
    const csrfCookies = extractCookies(csrfRes.headers);

    // Step 2: sign in with credentials
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

    // Check for error in redirect URL (NextAuth signals failure via ?error=)
    const location = signInRes.headers.get("location") ?? "";
    let resultUrl = "";
    try {
      const json = await signInRes.json();
      resultUrl = json?.url ?? "";
    } catch {
      resultUrl = location;
    }

    if (resultUrl.includes("error=") || (!resultUrl && signInRes.status >= 400)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Step 3: fetch session to get user details
    const sessionRes = await fetch(`${HRMS_BASE}/api/auth/session`, {
      headers: {
        Accept: "application/json",
        Cookie: allCookies,
      },
    });

    const sessionData = await sessionRes.json().catch(() => ({}));
    console.log("HRMS session response:", JSON.stringify(sessionData));

    const user = sessionData?.user ?? null;

    if (!user?.email) {
      console.error("No user in session. allCookies:", allCookies, "sessionData:", sessionData);
      return NextResponse.json({ error: "Login failed — could not retrieve user" }, { status: 401 });
    }

    await createSession({
      id: String(user.id ?? user.employeeId ?? user.email),
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
