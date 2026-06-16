"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Plus,
  CheckCircle,
  Briefcase,
  FileSearch,
  ShoppingCart,
  PackageCheck,
  ClipboardCheck,
  Package,
  ArrowLeftRight,
  Monitor,
  Building2,
  MapPin,
  BarChart3,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

interface SidebarProps {
  user?: SessionUser | null;
}

const ROLES = {
  ADMIN: "ADMIN",
  MANAGEMENT: "MANAGEMENT",
  PROCUREMENT: "PROCUREMENT",
  FINANCE: "FINANCE",
  STOREKEEPER: "STOREKEEPER",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  MANAGER: "MANAGER",
} as const;

const MODULES = {
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

function hasModuleAccess(user: SessionUser | null | undefined, module: string, fallbackRoles: string[] = []) {
  if (!user) return false;
  if (user.moduleAccess?.includes(module)) return true;
  return fallbackRoles.includes(user.role);
}

function NavItem({
  href,
  label,
  icon: Icon,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}) {
  const pathname = usePathname();
  const active =
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-blue-600 text-white"
          : "text-gray-300 hover:bg-gray-800 hover:text-white"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
          {badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
      {label}
    </p>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/approvals?count=true")
      .then((r) => r.json())
      .then((d) => setPendingCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  const role = user?.role ?? "REQUESTER";
  const isManagement = role === ROLES.MANAGEMENT;
  const isProcurement = role === ROLES.PROCUREMENT;
  const isStorekeeper = role === ROLES.STOREKEEPER;
  const canApprove = hasModuleAccess(user, MODULES.APPROVALS, [
    ROLES.MANAGEMENT,
    ROLES.PROCUREMENT,
    ROLES.FINANCE,
    ROLES.DEPARTMENT_HEAD,
    ROLES.MANAGER,
  ]);

  const showProcurement =
    isProcurement ||
    hasModuleAccess(user, MODULES.PROCUREMENT) ||
    hasModuleAccess(user, MODULES.QUOTATIONS) ||
    hasModuleAccess(user, MODULES.PURCHASE_ORDERS) ||
    hasModuleAccess(user, MODULES.GRN) ||
    hasModuleAccess(user, MODULES.DELIVERY);
  const showInventory =
    isStorekeeper ||
    hasModuleAccess(user, MODULES.STOCK) ||
    hasModuleAccess(user, MODULES.TRANSFERS) ||
    hasModuleAccess(user, MODULES.ASSETS) ||
    hasModuleAccess(user, MODULES.DELIVERY);
  const showManagement =
    isManagement ||
    isProcurement ||
    hasModuleAccess(user, MODULES.SUPPLIERS) ||
    hasModuleAccess(user, MODULES.LOCATIONS) ||
    hasModuleAccess(user, MODULES.REPORTS) ||
    hasModuleAccess(user, MODULES.SETTINGS);

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col shrink-0">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-700">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">Procurement</p>
          <p className="text-xs text-gray-400">Vahmaafushi</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavItem href="/dashboard" label="Dashboard" icon={LayoutDashboard} />
        <NavItem href="/dashboard/requests" label="My Requests" icon={FileText} />
        <NavItem href="/dashboard/requests/new" label="Create Request" icon={Plus} />
        {canApprove && (
          <NavItem
            href="/dashboard/approvals"
            label="Approvals"
            icon={CheckCircle}
            badge={pendingCount}
          />
        )}

        {showProcurement && (
          <>
            <SectionLabel label="Procurement" />
            {hasModuleAccess(user, MODULES.PROCUREMENT, [ROLES.PROCUREMENT]) && (
              <NavItem
                href="/dashboard/procurement"
                label="Procurement Processing"
                icon={Briefcase}
              />
            )}
            {hasModuleAccess(user, MODULES.QUOTATIONS, [ROLES.PROCUREMENT]) && (
              <NavItem href="/dashboard/quotations" label="Quotations" icon={FileSearch} />
            )}
            {hasModuleAccess(user, MODULES.PURCHASE_ORDERS, [ROLES.PROCUREMENT]) && (
              <NavItem
                href="/dashboard/purchase-orders"
                label="Purchase Orders"
                icon={ShoppingCart}
              />
            )}
            {hasModuleAccess(user, MODULES.GRN, [ROLES.PROCUREMENT]) && (
              <NavItem href="/dashboard/grn" label="Goods Received" icon={PackageCheck} />
            )}
            {hasModuleAccess(user, MODULES.DELIVERY, [ROLES.PROCUREMENT, ROLES.STOREKEEPER]) && (
              <NavItem href="/dashboard/delivery" label="Delivery Confirmation" icon={ClipboardCheck} />
            )}
          </>
        )}

        {showInventory && (
          <>
            <SectionLabel label="Inventory" />
            {hasModuleAccess(user, MODULES.STOCK, [ROLES.STOREKEEPER]) && (
              <NavItem href="/dashboard/stock" label="Stock / Inventory" icon={Package} />
            )}
            {!showProcurement && hasModuleAccess(user, MODULES.DELIVERY, [ROLES.STOREKEEPER]) && (
              <NavItem href="/dashboard/delivery" label="Delivery Confirmation" icon={ClipboardCheck} />
            )}
            {hasModuleAccess(user, MODULES.TRANSFERS, [ROLES.STOREKEEPER]) && (
              <NavItem
                href="/dashboard/transfers"
                label="Stock Transfers"
                icon={ArrowLeftRight}
              />
            )}
            {hasModuleAccess(user, MODULES.ASSETS, [ROLES.STOREKEEPER]) && (
              <NavItem href="/dashboard/assets" label="Assets" icon={Monitor} />
            )}
          </>
        )}

        {showManagement && (
          <>
            <SectionLabel label="Management" />
            {hasModuleAccess(user, MODULES.SUPPLIERS, [ROLES.MANAGEMENT, ROLES.PROCUREMENT]) && (
              <NavItem href="/dashboard/suppliers" label="Suppliers" icon={Building2} />
            )}
            {hasModuleAccess(user, MODULES.LOCATIONS, [ROLES.MANAGEMENT]) && (
              <NavItem href="/dashboard/locations" label="Locations" icon={MapPin} />
            )}
            {hasModuleAccess(user, MODULES.REPORTS, [ROLES.MANAGEMENT, ROLES.PROCUREMENT]) && (
              <NavItem href="/dashboard/reports" label="Reports" icon={BarChart3} />
            )}
            {hasModuleAccess(user, MODULES.SETTINGS) && (
              <NavItem href="/dashboard/settings" label="Admin Settings" icon={Settings} />
            )}
          </>
        )}

      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 px-3">&copy; 2025 Vahmaafushi</p>
      </div>
    </aside>
  );
}
