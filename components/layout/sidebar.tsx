"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Building2,
  CheckCircle,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/requisitions", label: "Requisitions", icon: FileText },
  { href: "/dashboard/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/dashboard/approvals", label: "Approvals", icon: CheckCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-700">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">Procurement</p>
          <p className="text-xs text-gray-400">Vahmaafushi</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 px-3">© 2024 Vahmaafushi</p>
      </div>
    </aside>
  );
}
