import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "procurement_session";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "procurement-secret-key-fallback-32chars"
);

export interface SessionUser {
  id: string;          // local Employee.id (cuid)
  hrmsId: string;
  name: string;
  email: string;
  companyId?: string;
  department?: string;
  section?: string;
  designation?: string;
  workLocation?: string;
  unit?: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  departmentManagerId?: string;
  departmentManagerName?: string;
  hrmsRoles?: string[];
  employmentStatus: string;
  procurementRole?: string;
  moduleAccess?: string[];
  role: string;        // effective procurement role
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return (payload as { user: SessionUser }).user;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionFromToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload as { user: SessionUser }).user;
  } catch {
    return null;
  }
}

// Role hierarchy for UI checks
export const ROLES = {
  ADMIN: "ADMIN",
  MANAGEMENT: "MANAGEMENT",
  PROCUREMENT: "PROCUREMENT",
  FINANCE: "FINANCE",
  STOREKEEPER: "STOREKEEPER",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  MANAGER: "MANAGER",
  REQUESTER: "REQUESTER",
} as const;

export type ProcurementRole = typeof ROLES[keyof typeof ROLES];

export const MODULES = {
  APPROVALS: "approvals",
  PROCUREMENT: "procurement",
  QUOTATIONS: "quotations",
  PURCHASE_ORDERS: "purchase-orders",
  GRN: "grn",
  DELIVERY: "delivery",
  STOCK: "stock",
  TRANSFERS: "transfers",
  ASSETS: "assets",
  SUPPLIERS: "suppliers",
  LOCATIONS: "locations",
  REPORTS: "reports",
  SETTINGS: "settings",
} as const;

export type ModuleKey = typeof MODULES[keyof typeof MODULES];

export function hasRole(user: SessionUser, ...roles: string[]) {
  return roles.includes(user.role);
}

export function hasModuleAccess(user: SessionUser | null | undefined, module: ModuleKey, fallbackRoles: string[] = []) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  if (user.moduleAccess?.includes(module)) return true;
  return fallbackRoles.includes(user.role);
}

export function canApprove(user: SessionUser) {
  return hasModuleAccess(user, MODULES.APPROVALS, [
    ROLES.MANAGEMENT,
    ROLES.PROCUREMENT,
    ROLES.FINANCE,
    ROLES.DEPARTMENT_HEAD,
    ROLES.MANAGER,
  ]);
}
