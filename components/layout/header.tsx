"use client";

import { useRouter } from "next/navigation";
import { Building2, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { SessionUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header({ user }: { user: SessionUser }) {
  const router = useRouter();
  const activeContextValue = `${user.activeCompanyId ?? ""}::${user.activeProjectId ?? ""}`;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  const switchContext = async (value: string) => {
    const [companyId, projectId] = value.split("::");
    const response = await fetch("/api/auth/context", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, projectId: projectId || null }),
    });
    if (!response.ok) {
      toast.error("Could not switch company");
      return;
    }
    toast.success("Company context changed");
    router.refresh();
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 dark:border-slate-800 dark:bg-slate-950">
      <div />
      <div className="flex items-center gap-3">
        {user.contexts && user.contexts.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            <Building2 className="h-4 w-4 text-blue-600" />
            <select
              value={activeContextValue}
              onChange={(event) => switchContext(event.target.value)}
              className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {user.contexts.map((context) => (
                <option key={`${context.companyId}-${context.projectId ?? "company"}`} value={`${context.companyId}::${context.projectId ?? ""}`}>
                  {context.companyName}{context.projectName ? ` / ${context.projectName}` : ""} - {context.role}
                </option>
              ))}
            </select>
          </label>
        )}
        {user.contexts && user.contexts.length <= 1 && (user.activeCompanyName || user.companyName) && (
          <div className="hidden sm:flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{user.activeCompanyName ?? user.companyName}</span>
          </div>
        )}
        <ThemeToggle />
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center dark:bg-blue-950">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-medium">{user.name}</span>
          {user.role && (
            <span className="text-xs text-gray-400 capitalize dark:text-slate-500">({user.role})</span>
          )}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded dark:text-slate-400 dark:hover:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}
