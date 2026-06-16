import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-MV", { style: "currency", currency: "MVR" }).format(amount);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-MV", { dateStyle: "medium" }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-MV", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

// Auto-number generators
export async function nextNumber(prefix: string, count: number) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    SUBMITTED: "bg-blue-50 text-blue-700",
    PENDING_SUPERVISOR_APPROVAL: "bg-yellow-50 text-yellow-700",
    PENDING_MANAGER_APPROVAL: "bg-yellow-50 text-yellow-700",
    PENDING_DEPT_HEAD_APPROVAL: "bg-orange-50 text-orange-700",
    APPROVED_BY_SUPERVISOR: "bg-green-50 text-green-700",
    APPROVED_BY_DEPT_HEAD: "bg-green-50 text-green-700",
    REJECTED: "bg-red-50 text-red-700",
    REJECTED_BY_SUPERVISOR: "bg-red-50 text-red-700",
    CHECKING_STOCK: "bg-purple-50 text-purple-700",
    AVAILABLE_IN_STOCK: "bg-teal-50 text-teal-700",
    STOCK_TRANSFER_REQUIRED: "bg-indigo-50 text-indigo-700",
    PURCHASE_REQUIRED: "bg-orange-50 text-orange-700",
    QUOTATION_PENDING: "bg-yellow-50 text-yellow-700",
    SUPPLIER_SELECTED: "bg-blue-50 text-blue-700",
    PO_CREATED: "bg-blue-100 text-blue-800",
    FINANCE_APPROVAL_PENDING: "bg-purple-50 text-purple-700",
    PURCHASE_APPROVED: "bg-green-50 text-green-700",
    PURCHASED: "bg-teal-50 text-teal-700",
    GOODS_RECEIVED: "bg-teal-100 text-teal-800",
    IN_TRANSIT: "bg-indigo-50 text-indigo-700",
    DELIVERED: "bg-green-100 text-green-800",
    PARTIALLY_DELIVERED: "bg-orange-50 text-orange-700",
    COMPLETED: "bg-green-200 text-green-900",
    CANCELLED: "bg-gray-200 text-gray-600",
    PENDING: "bg-yellow-50 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    ISSUED: "bg-blue-100 text-blue-700",
    RECEIVED: "bg-green-100 text-green-700",
    IN_STORE: "bg-gray-100 text-gray-600",
    ACTIVE: "bg-green-100 text-green-700",
    INACTIVE: "bg-gray-100 text-gray-500",
    SENT: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-green-100 text-green-700",
    PENDING_APPROVAL: "bg-yellow-50 text-yellow-700",
    FULLY_RECEIVED: "bg-green-100 text-green-700",
    PARTIALLY_RECEIVED: "bg-orange-50 text-orange-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    NORMAL: "bg-gray-100 text-gray-600",
    URGENT: "bg-orange-100 text-orange-700",
    EMERGENCY: "bg-red-100 text-red-700",
  };
  return map[priority] ?? "bg-gray-100 text-gray-600";
}

export function requestTypeColor(type: string): string {
  const map: Record<string, string> = {
    PURCHASE: "bg-blue-50 text-blue-700",
    STOCK: "bg-teal-50 text-teal-700",
    ASSET: "bg-purple-50 text-purple-700",
    EMERGENCY: "bg-red-50 text-red-700",
  };
  return map[type] ?? "bg-gray-50 text-gray-600";
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: "Admin",
    MANAGEMENT: "Management",
    PROCUREMENT: "Procurement Officer",
    FINANCE: "Finance Officer",
    STOREKEEPER: "Storekeeper",
    DEPARTMENT_HEAD: "Department Head",
    MANAGER: "Manager / Supervisor",
    REQUESTER: "Staff / Requester",
  };
  return map[role] ?? role;
}
