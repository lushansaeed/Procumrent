type UnknownRecord = Record<string, unknown>;

const HRMS_BASE = (process.env.HRMS_API_URL ?? "https://hrms.vahmaafushi.com").replace(/\/api$/, "");

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function pickText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function pickArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  for (const key of ["data", "companies", "items", "results", "rows"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

export type HrmsCompany = {
  hrmsCompanyId: string;
  code?: string;
  name: string;
};

export async function fetchHrmsCompanies(): Promise<HrmsCompany[]> {
  const headers: HeadersInit = { Accept: "application/json" };
  if (process.env.HRMS_API_TOKEN) headers.Authorization = `Bearer ${process.env.HRMS_API_TOKEN}`;

  const endpoints = [
    "/api/companies",
    "/api/company",
    "/api/organization/companies",
    "/api/organizations/companies",
    "/api/hr/companies",
    "/api/settings/companies",
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(`${HRMS_BASE}${endpoint}`, { headers, cache: "no-store" }).catch(() => null);
    if (!response?.ok) continue;

    const payload = await response.json().catch(() => null);
    const companies = pickArray(payload)
      .map((item) => {
        const record = asRecord(item);
        const hrmsCompanyId = pickText(record.id, record.companyId, record.companyID, record.company_id, record.code, record.companyCode);
        const name = pickText(record.name, record.companyName, record.company_name, record.title, record.fullName);
        const code = pickText(record.code, record.companyCode, record.company_code, record.shortCode);
        if (!hrmsCompanyId || !name) return null;
        return code ? { hrmsCompanyId, code, name } : { hrmsCompanyId, name };
      })
      .filter((item): item is HrmsCompany => Boolean(item));

    if (companies.length > 0) return companies;
  }

  return [];
}
