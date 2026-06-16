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
  const isAdmin = role === "ADMIN";
  const isManagement = role === "MANAGEMENT";
  const isProcurement = role === "PROCUREMENT";
  const isStorekeeper = role === "STOREKEEPER";
  const canApprove = [
    "ADMIN",
    "MANAGEMENT",
    "PROCUREMENT",
    "FINANCE",
    "DEPARTMENT_HEAD",
    "MANAGER",
  ].includes(role);

  const showProcurement = isAdmin || isProcurement;
  const showInventory = isAdmin || isStorekeeper;
  const showManagement = isAdmin || isManagement || isProcurement;

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
            <NavItem
              href="/dashboard/procurement"
              label="Procurement Processing"
              icon={Briefcase}
            />
            <NavItem href="/dashboard/quotations" label="Quotations" icon={FileSearch} />
            <NavItem
              href="/dashboard/purchase-orders"
              label="Purchase Orders"
              icon={ShoppingCart}
            />
            <NavItem href="/dashboard/grn" label="Goods Received" icon={PackageCheck} />
          </>
        )}

        {showInventory && (
          <>
            <SectionLabel label="Inventory" />
            <NavItem href="/dashboard/stock" label="Stock / Inventory" icon={Package} />
            <NavItem
              href="/dashboard/transfers"
              label="Stock Transfers"
              icon={ArrowLeftRight}
            />
            <NavItem href="/dashboard/assets" label="Assets" icon={Monitor} />
          </>
        )}

        {showManagement && (
          <>
            <SectionLabel label="Management" />
            <NavItem href="/dashboard/suppliers" label="Suppliers" icon={Building2} />
            {(isAdmin || isManagement) && (
              <NavItem href="/dashboard/locations" label="Locations" icon={MapPin} />
            )}
            <NavItem href="/dashboard/reports" label="Reports" icon={BarChart3} />
            {isAdmin && (
              <NavItem href="/dashboard/settings" label="Admin Settings" icon={Settings} />
            )}
          </>
        )}

        {!showManagement && (
          <NavItem href="/dashboard/reports" label="Reports" icon={BarChart3} />
        )}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 px-3">© 2025 Vahmaafushi</p>
      </div>
    </aside>
  );
}
