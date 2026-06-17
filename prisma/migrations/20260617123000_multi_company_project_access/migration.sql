-- Procurement-side multi-company and multi-project access.
-- HRMS remains the source of company identity; procurement stores access and roles.

CREATE TABLE IF NOT EXISTS "ProcurementCompany" (
  "id" TEXT NOT NULL,
  "hrmsCompanyId" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcurementCompany_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementCompany_hrmsCompanyId_key" ON "ProcurementCompany"("hrmsCompanyId");

CREATE TABLE IF NOT EXISTS "ProcurementProject" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcurementProject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementProject_companyId_code_key" ON "ProcurementProject"("companyId", "code");

CREATE TABLE IF NOT EXISTS "ProcurementAccess" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "projectId" TEXT,
  "role" TEXT NOT NULL DEFAULT 'REQUESTER',
  "moduleAccess" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcurementAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementAccess_employeeId_companyId_projectId_key" ON "ProcurementAccess"("employeeId", "companyId", "projectId");
CREATE INDEX IF NOT EXISTS "ProcurementAccess_companyId_idx" ON "ProcurementAccess"("companyId");
CREATE INDEX IF NOT EXISTS "ProcurementAccess_projectId_idx" ON "ProcurementAccess"("projectId");

ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "procurementCompanyId" TEXT;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "procurementProjectId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProcurementProject_companyId_fkey'
  ) THEN
    ALTER TABLE "ProcurementProject"
      ADD CONSTRAINT "ProcurementProject_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "ProcurementCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProcurementAccess_employeeId_fkey'
  ) THEN
    ALTER TABLE "ProcurementAccess"
      ADD CONSTRAINT "ProcurementAccess_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProcurementAccess_companyId_fkey'
  ) THEN
    ALTER TABLE "ProcurementAccess"
      ADD CONSTRAINT "ProcurementAccess_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "ProcurementCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProcurementAccess_projectId_fkey'
  ) THEN
    ALTER TABLE "ProcurementAccess"
      ADD CONSTRAINT "ProcurementAccess_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "ProcurementProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ProcurementCompany" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProcurementProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProcurementAccess" ENABLE ROW LEVEL SECURITY;
