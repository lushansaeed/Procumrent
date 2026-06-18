"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-9 items-center rounded-md border border-gray-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      {themes.map((item) => {
        const Icon = item.icon;
        const active = theme === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => setTheme(item.value)}
            title={`${item.label} theme`}
            aria-label={`${item.label} theme`}
            aria-pressed={active}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-white",
              active && "bg-blue-600 text-white shadow-sm hover:text-white dark:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
