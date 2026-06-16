import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-MV", {
    style: "currency",
    currency: "MVR",
  }).format(amount);
}

export function generatePRNumber(count: number) {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, "0");
  return `PR-${year}-${seq}`;
}

export function generatePONumber(count: number) {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, "0");
  return `PO-${year}-${seq}`;
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    CONVERTED: "bg-blue-100 text-blue-700",
    SENT: "bg-blue-100 text-blue-700",
    ACKNOWLEDGED: "bg-purple-100 text-purple-700",
    RECEIVED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    ACTIVE: "bg-green-100 text-green-700",
    INACTIVE: "bg-gray-100 text-gray-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

export function priorityColor(priority: string) {
  const map: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-600",
    MEDIUM: "bg-blue-100 text-blue-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
  };
  return map[priority] ?? "bg-gray-100 text-gray-600";
}
