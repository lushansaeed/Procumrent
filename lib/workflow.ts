import { db } from "@/lib/db";

type RequestDraft = {
  requestType?: string | null;
  priority?: string | null;
  department?: string | null;
  estimatedTotal: number;
};

type ApprovalStep = {
  step: number;
  role: string;
  label: string;
};

type MatrixConditions = {
  requestType?: string;
  priority?: string;
  department?: string;
  amountMin?: number;
  amountMax?: number;
};

type MatrixStep = {
  role: string;
  label?: string;
  required?: boolean;
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function matchesConditions(conditions: MatrixConditions, draft: RequestDraft) {
  if (conditions.requestType && conditions.requestType !== draft.requestType) return false;
  if (conditions.priority && conditions.priority !== draft.priority) return false;
  if (conditions.department && conditions.department !== draft.department) return false;
  if (conditions.amountMin != null && draft.estimatedTotal < conditions.amountMin) return false;
  if (conditions.amountMax != null && draft.estimatedTotal > conditions.amountMax) return false;
  return true;
}

function defaultApprovalSteps(draft: RequestDraft): ApprovalStep[] {
  const steps: ApprovalStep[] = [
    { step: 1, role: "REPORTING_MANAGER", label: "Reporting Manager Approval" },
  ];

  if (draft.estimatedTotal > 50000 || draft.requestType === "ASSET") {
    steps.push({ step: steps.length + 1, role: "DEPARTMENT_HEAD", label: "Department Head Approval" });
  }

  steps.push({ step: steps.length + 1, role: "PROCUREMENT", label: "Procurement Review" });

  if (draft.estimatedTotal > 10000 || draft.requestType === "ASSET") {
    steps.push({ step: steps.length + 1, role: "FINANCE", label: "Finance Approval" });
  }

  if (draft.estimatedTotal > 50000) {
    steps.push({ step: steps.length + 1, role: "MANAGEMENT", label: "Management Approval" });
  }

  return steps;
}

export async function buildApprovalSteps(draft: RequestDraft): Promise<ApprovalStep[]> {
  const matrices = await db.approvalMatrix.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const matrix = matrices.find((rule) =>
    matchesConditions(parseJson<MatrixConditions>(rule.conditions, {}), draft)
  );

  if (!matrix) return defaultApprovalSteps(draft);

  const configuredSteps = parseJson<MatrixStep[]>(matrix.steps, [])
    .filter((step) => step.required !== false && step.role)
    .map((step, index) => ({
      step: index + 1,
      role: step.role,
      label: step.label ?? step.role.replace(/_/g, " "),
    }));

  return configuredSteps.length > 0 ? configuredSteps : defaultApprovalSteps(draft);
}

export function requestStatusForApprovalRole(role: string) {
  switch (role) {
    case "REPORTING_MANAGER":
      return "PENDING_SUPERVISOR_APPROVAL";
    case "DEPARTMENT_HEAD":
      return "PENDING_DEPARTMENT_HEAD_APPROVAL";
    case "FINANCE":
      return "FINANCE_APPROVAL_PENDING";
    case "MANAGEMENT":
      return "MANAGEMENT_APPROVAL_PENDING";
    case "PROCUREMENT":
      return "PENDING_PROCUREMENT_REVIEW";
    default:
      return "PENDING_APPROVAL";
  }
}

export function canActOnApproval(role: string, sessionRole: string) {
  if (sessionRole === "ADMIN") return true;
  if (role === "REPORTING_MANAGER" && sessionRole === "MANAGER") return true;
  return role === sessionRole;
}
