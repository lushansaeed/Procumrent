export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag, MapPin, Users, Sliders } from "lucide-react";

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [categories, locations, employees] = await Promise.all([
    db.itemCategory.findMany({ orderBy: { name: "asc" } }),
    db.location.findMany({ orderBy: { name: "asc" } }),
    db.employee.findMany({ where: { procurementRole: { not: null } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage system configuration</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-blue-600" /><CardTitle className="text-base">Item Categories</CardTitle></div>
            <Badge className="bg-blue-50 text-blue-700">{categories.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {categories.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No categories yet</p> : categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                  <div><span className="text-sm font-medium">{cat.name}</span><span className="ml-2 text-xs text-gray-400">{cat.code}</span></div>
                  <Badge className={cat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{cat.isActive ? "Active" : "Inactive"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /><CardTitle className="text-base">Locations</CardTitle></div>
            <Button variant="outline" size="sm" asChild><Link href="/dashboard/locations">Manage</Link></Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {locations.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No locations yet</p> : locations.map(loc => (
                <div key={loc.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                  <div><span className="text-sm font-medium">{loc.name}</span><span className="ml-2 text-xs text-gray-400">{loc.code}</span></div>
                  <Badge className={loc.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{loc.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /><CardTitle className="text-base">Procurement Role Assignments</CardTitle></div>
            <Badge className="bg-blue-50 text-blue-700">{employees.length} assigned</Badge>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No employees assigned procurement roles yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50"><th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Name</th><th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Email</th><th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Department</th><th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Role</th></tr></thead>
                  <tbody>{employees.map(emp => (<tr key={emp.id} className="border-b hover:bg-gray-50"><td className="px-4 py-2 font-medium">{emp.name}</td><td className="px-4 py-2 text-gray-500">{emp.email}</td><td className="px-4 py-2 text-gray-500">{emp.department ?? "—"}</td><td className="px-4 py-2"><Badge className="bg-purple-50 text-purple-700">{emp.procurementRole}</Badge></td></tr>))}</tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><div className="flex items-center gap-2"><Sliders className="w-4 h-4 text-blue-600" /><CardTitle className="text-base">System Configuration</CardTitle></div></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[{label:"Currency",value:"MVR (Maldivian Rufiyaa)"},{label:"Request Numbering",value:"PR-YYYY-NNNN"},{label:"PO Numbering",value:"PO-YYYY-NNNN"},{label:"GRN Numbering",value:"GRN-YYYY-NNNN"}].map(s => (
                <div key={s.label} className="p-4 rounded-lg border bg-gray-50"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p><p className="mt-1 text-sm font-medium">{s.value}</p></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
