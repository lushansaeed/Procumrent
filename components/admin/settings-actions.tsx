"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Save, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Employee = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  procurementRole: string | null;
};

type ApprovalMatrix = {
  id: string;
  name: string;
  description: string | null;
  conditions: string;
  steps: string;
  isActive: boolean;
};

const roleOptions = [
  "REQUESTER",
  "MANAGER",
  "DEPARTMENT_HEAD",
  "PROCUREMENT",
  "STOREKEEPER",
  "FINANCE",
  "MANAGEMENT",
  "ADMIN",
];

const approvalRoleOptions = [
  "REPORTING_MANAGER",
  "DEPARTMENT_HEAD",
  "PROCUREMENT",
  "STOREKEEPER",
  "FINANCE",
  "MANAGEMENT",
];

export function SettingsActions({
  employees,
  approvalMatrices,
}: {
  employees: Employee[];
  approvalMatrices: ApprovalMatrix[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState({ code: "", name: "", description: "" });
  const [roleAssignment, setRoleAssignment] = useState({ employeeId: "", role: "REQUESTER" });
  const [matrix, setMatrix] = useState({
    name: "",
    description: "",
    requestType: "ANY",
    priority: "ANY",
    amountMin: "",
    amountMax: "",
    steps: ["REPORTING_MANAGER", "PROCUREMENT"],
  });

  async function createCategory() {
    const res = await fetch("/api/item-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    });
    if (!res.ok) {
      toast.error("Could not create category");
      return;
    }
    toast.success("Category created");
    setCategory({ code: "", name: "", description: "" });
    router.refresh();
  }

  async function assignRole() {
    if (!roleAssignment.employeeId) {
      toast.error("Select an employee");
      return;
    }

    const res = await fetch(`/api/employees/${roleAssignment.employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ procurementRole: roleAssignment.role }),
    });
    if (!res.ok) {
      toast.error("Could not assign role");
      return;
    }
    toast.success("Role assigned");
    router.refresh();
  }

  async function createMatrixRule() {
    const res = await fetch("/api/settings/approval-matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: matrix.name,
        description: matrix.description,
        requestType: matrix.requestType === "ANY" ? undefined : matrix.requestType,
        priority: matrix.priority === "ANY" ? undefined : matrix.priority,
        amountMin: matrix.amountMin,
        amountMax: matrix.amountMax,
        steps: matrix.steps.map((role) => ({ role })),
      }),
    });
    if (!res.ok) {
      toast.error("Could not create approval rule");
      return;
    }
    toast.success("Approval rule created");
    setMatrix({
      name: "",
      description: "",
      requestType: "ANY",
      priority: "ANY",
      amountMin: "",
      amountMax: "",
      steps: ["REPORTING_MANAGER", "PROCUREMENT"],
    });
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            Add Item Category
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={category.code} onChange={(event) => setCategory({ ...category, code: event.target.value.toUpperCase() })} placeholder="IT" />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={category.name} onChange={(event) => setCategory({ ...category, name: event.target.value })} placeholder="IT Equipment" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={category.description} onChange={(event) => setCategory({ ...category, description: event.target.value })} />
          </div>
          <Button onClick={createCategory} disabled={!category.code || !category.name}>
            <Save className="w-4 h-4" />
            Save Category
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="w-4 h-4 text-blue-600" />
            Assign Procurement Role
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select value={roleAssignment.employeeId} onValueChange={(employeeId) => setRoleAssignment({ ...roleAssignment, employeeId })}>
              <SelectTrigger><SelectValue placeholder="Select HRMS employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} - {employee.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={roleAssignment.role} onValueChange={(role) => setRoleAssignment({ ...roleAssignment, role })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={assignRole}>
            <Save className="w-4 h-4" />
            Assign Role
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Create Approval Matrix Rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rule Name</Label>
              <Input value={matrix.name} onChange={(event) => setMatrix({ ...matrix, name: event.target.value })} placeholder="Purchase above MVR 10,000" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={matrix.description} onChange={(event) => setMatrix({ ...matrix, description: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Request Type</Label>
              <Select value={matrix.requestType} onValueChange={(requestType) => setMatrix({ ...matrix, requestType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Any</SelectItem>
                  <SelectItem value="PURCHASE">Purchase</SelectItem>
                  <SelectItem value="STOCK">Stock</SelectItem>
                  <SelectItem value="ASSET">Asset</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={matrix.priority} onValueChange={(priority) => setMatrix({ ...matrix, priority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Any</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount Min</Label>
              <Input type="number" value={matrix.amountMin} onChange={(event) => setMatrix({ ...matrix, amountMin: event.target.value })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Amount Max</Label>
              <Input type="number" value={matrix.amountMax} onChange={(event) => setMatrix({ ...matrix, amountMax: event.target.value })} placeholder="10000" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {matrix.steps.map((step, index) => (
              <div key={`${step}-${index}`} className="space-y-1.5">
                <Label>Step {index + 1}</Label>
                <Select
                  value={step}
                  onValueChange={(role) => {
                    const steps = [...matrix.steps];
                    steps[index] = role;
                    setMatrix({ ...matrix, steps });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {approvalRoleOptions.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setMatrix({ ...matrix, steps: [...matrix.steps, "FINANCE"] })}>
              <Plus className="w-4 h-4" />
              Add Step
            </Button>
            <Button onClick={createMatrixRule} disabled={!matrix.name || matrix.steps.length === 0}>
              <Save className="w-4 h-4" />
              Save Approval Rule
            </Button>
          </div>

          <div className="rounded-md border">
            {approvalMatrices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No custom approval rules yet. Defaults will be used.</p>
            ) : approvalMatrices.map((rule) => (
              <div key={rule.id} className="border-b last:border-b-0 p-3">
                <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                <p className="text-xs text-gray-500 mt-1">{rule.description ?? "No description"}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
