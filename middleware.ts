import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "procurement-secret-key-fallback-32chars"
);

type TokenUser = {
  role?: string;
  moduleAccess?: string[];
};

const moduleRoutes = [
  { prefix: "/dashboard/approvals", module: "approvals", roles: ["MANAGEMENT", "PROCUREMENT", "FINANCE", "DEPARTMENT_HEAD", "MANAGER"] },
  { prefix: "/dashboard/procurement", module: "procurement", roles: ["PROCUREMENT"] },
  { prefix: "/dashboard/quotations", module: "quotations", roles: ["PROCUREMENT"] },
  { prefix: "/dashboard/purchase-orders", module: "purchase-orders", roles: ["PROCUREMENT"] },
  { prefix: "/dashboard/grn", module: "grn", roles: ["PROCUREMENT"] },
  { prefix: "/dashboard/delivery", module: "delivery", roles: ["PROCUREMENT", "STOREKEEPER"] },
  { prefix: "/dashboard/stock", module: "stock", roles: ["STOREKEEPER"] },
  { prefix: "/dashboard/transfers", module: "transfers", roles: ["STOREKEEPER"] },
  { prefix: "/dashboard/assets", module: "assets", roles: ["STOREKEEPER"] },
  { prefix: "/dashboard/suppliers", module: "suppliers", roles: ["MANAGEMENT", "PROCUREMENT"] },
  { prefix: "/dashboard/locations", module: "locations", roles: ["MANAGEMENT"] },
  { prefix: "/dashboard/reports", module: "reports", roles: ["MANAGEMENT", "PROCUREMENT"] },
  { prefix: "/dashboard/settings", module: "settings", roles: [] },
];

function canOpenModule(user: TokenUser, module: string, roles: string[]) {
  if (user.moduleAccess?.includes(module)) return true;
  return Boolean(user.role && roles.includes(user.role));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("procurement_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const { payload } = await jwtVerify(token, secret);
      const user = (payload as { user?: TokenUser }).user ?? {};
      const protectedModule = moduleRoutes.find((route) => pathname.startsWith(route.prefix));
      if (protectedModule && !canOpenModule(user, protectedModule.module, protectedModule.roles)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
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
