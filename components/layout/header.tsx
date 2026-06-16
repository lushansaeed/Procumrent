"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { SessionUser } from "@/lib/auth";

export function Header({ user }: { user: SessionUser }) {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-medium">{user.name}</span>
          {user.role && (
            <span className="text-xs text-gray-400 capitalize">({user.role})</span>
          )}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}
