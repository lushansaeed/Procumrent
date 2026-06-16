import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "procurement-secret-key-fallback-32chars"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("procurement_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      await jwtVerify(token, secret);
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname === "/login") {
    const token = request.cookies.get("procurement_session")?.value;
    if (token) {
      try {
        await jwtVerify(token, secret);
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } catch {
        // invalid token, let them login
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
