export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, Sliders, Tag, Users } from "lucide-react";
import { SettingsActions } from "@/components/admin/settings-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODULES, getSession, hasModuleAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchHrmsCompanies } from "@/lib/hrms-companies";

function parseList(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!hasModuleAccess(user, MODULES.SETTINGS)) redirect("/dashboard");

  const hrmsCompanies = await fetchHrmsCompanies();
  if (hrmsCompanies.length > 0) {
    await Promise.all(
      hrmsCompanies.map((company) =>
        db.procurementCompany.upsert({
          where: { hrmsCompanyId: company.hrmsCompanyId },
          update: { name: company.name, code: company.code ?? company.hrmsCompanyId, isActive: true },
          create: {
            hrmsCompanyId: company.hrmsCompanyId,
            code: company.code ?? company.hrmsCompanyId,
            name: company.name,
          },
        })
      )
    );
  }

  const [categories, locations, accessAssignments, allEmployees, approvalMatrices, companies] = await Promise.all([
    db.itemCategory.findMany({ orderBy: { name: "asc" } }),
    db.location.findMany({ orderBy: { name: "asc" } }),
    db.procurementAccess.findMany({
      include: { employee: true, company: true, project: true },
      orderBy: { createdAt: "desc" },
    }),
    db.employee.findMany({ orderBy: { name: "asc" } }),
    db.approvalMatrix.findMany({ orderBy: { sortOrder: "asc" } }),
    db.procurementCompany.findMany({ include: { projects: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage roles, approval rules, categories, and system configuration</p>
      </div>

      <SettingsActions employees={allEmployees} approvalMatrices={approvalMatrices} companies={companies} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-base">Item Categories</CardTitle>
            </div>
            <Badge className="bg-blue-50 text-blue-700">{categories.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No categories yet</p>
              ) : categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                  <div>
                    <span className="text-sm font-medium">{category.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{category.code}</span>
                  </div>
                  <Badge className={category.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-base">Locations</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild><Link href="/dashboard/locations">Manage</Link></Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {locations.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No locations yet</p>
              ) : locations.map((location) => (
                <div key={location.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                  <div>
                    <span className="text-sm font-medium">{location.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{location.code}</span>
                  </div>
                  <Badge className={location.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{location.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-base">Procurement Role Assignments</CardTitle>
            </div>
            <Badge className="bg-blue-50 text-blue-700">{accessAssignments.length} assigned</Badge>
          </CardHeader>
          <CardContent>
            {accessAssignments.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No employees assigned procurement access yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Work Email</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Company / Project</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Department</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Role</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Modules</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessAssignments.map((assignment) => {
                      const modules = parseList(assignment.moduleAccess);
                      return (
                        <tr key={assignment.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{assignment.employee.name}</td>
                          <td className="px-4 py-2 text-gray-500">{assignment.employee.workEmail ?? "-"}</td>
                          <td className="px-4 py-2 text-gray-500">{[assignment.company.name, assignment.project?.name].filter(Boolean).join(" / ")}</td>
                          <td className="px-4 py-2 text-gray-500">{assignment.employee.department ?? "-"}</td>
                          <td className="px-4 py-2"><Badge className="bg-purple-50 text-purple-700">{assignment.role}</Badge></td>
                          <td className="px-4 py-2 text-gray-500">{modules.length > 0 ? modules.join(", ") : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-base">System Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Currency", value: "MVR (Maldivian Rufiyaa)" },
                { label: 