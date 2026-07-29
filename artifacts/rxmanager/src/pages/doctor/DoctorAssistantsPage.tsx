import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListAssistants, useCreateAssistant, useDeleteAssistant, useResetAssistantPassword,
} from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Mail, ShieldCheck, Users, KeyRound, ChevronDown, ChevronUp } from "lucide-react";

function useUpdateAssistantPermissions() {
  return useMutation({
    mutationFn: async ({ id, permissions }: { id: number; permissions: Record<string, boolean> }) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/assistants/${id}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(permissions),
      });
      if (!res.ok) throw new Error("Failed to update permissions");
      return res.json();
    },
  });
}

export default function DoctorAssistantsPage() {
  const { toast } = useToast();
  const { data: assistants, refetch, isLoading } = useListAssistants({
    query: { queryKey: ["assistants"] },
  });
  const createMut = useCreateAssistant();
  const deleteMut = useDeleteAssistant();
  const resetMut = useResetAssistantPassword();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [expandedPerms, setExpandedPerms] = useState<number | null>(null);
  const [localPerms, setLocalPerms] = useState<Record<number, { canViewTemplates: boolean }>>({});
  const updatePerms = useUpdateAssistantPermissions();

  const getPerms = (a: { id: number; permissions?: string | null }) => {
    if (localPerms[a.id] !== undefined) return localPerms[a.id];
    try { return JSON.parse((a as any).permissions ?? "{}"); } catch { return {}; }
  };

  const handleTogglePerm = async (id: number, key: "canViewTemplates", value: boolean) => {
    const next = { ...getPerms({ id }), [key]: value };
    setLocalPerms(p => ({ ...p, [id]: next }));
    try {
      await updatePerms.mutateAsync({ id, permissions: next });
      toast({ title: "Permissions updated" });
    } catch {
      toast({ title: "Failed to update permissions", variant: "destructive" });
      setLocalPerms(p => { const c = { ...p }; delete c[id]; return c; });
    }
  };

  const handleResetPassword = async (id: number, name: string | null) => {
    const newPassword = prompt(`Set a new password for ${name ?? "this assistant"} (min 6 characters):`);
    if (newPassword == null) return;
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    try {
      await resetMut.mutateAsync({ id, data: { newPassword } });
      toast({ title: "Password reset successfully" });
    } catch {
      toast({ title: "Failed to reset password", variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    try {
      await createMut.mutateAsync({ data: form });
      toast({ title: "Assistant account created" });
      setForm({ name: "", email: "", password: "" });
      refetch();
    } catch (e: any) {
      toast({ title: e?.message?.includes("409") ? "Email already in use" : "Failed to create assistant", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, name: string | null) => {
    if (!confirm(`Remove assistant ${name ?? ""}? They will lose access immediately.`)) return;
    try {
      await deleteMut.mutateAsync({ id });
      toast({ title: "Assistant removed" });
      refetch();
    } catch {
      toast({ title: "Failed to remove assistant", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Assistants
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create accounts for your assistants. They can manage your bookings, add offline appointments, and record patient vitals that auto-fill into your prescriptions.
          </p>
        </div>

        {/* Create form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Add new assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Full name</label>
                <Input className="mt-1" placeholder="Assistant name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Login email</label>
                <Input className="mt-1" type="email" placeholder="assistant@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <Input className="mt-1" type="text" placeholder="Set a password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
            <Button className="mt-4" onClick={handleCreate} disabled={createMut.isPending}>
              <UserPlus className="h-4 w-4 mr-1.5" /> Create assistant
            </Button>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your assistants</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading...</p>
            ) : !assistants?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No assistants yet. Create one above.</p>
            ) : (
              <div className="divide-y">
                {assistants.map(a => {
                  const perms = getPerms(a);
                  const isExpanded = expandedPerms === a.id;
                  return (
                    <div key={a.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                            {a.name?.charAt(0) ?? "A"}
                          </div>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              {a.name} <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {a.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1 text-xs"
                            onClick={() => setExpandedPerms(isExpanded ? null : a.id)}>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            Permissions
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary"
                            onClick={() => handleResetPassword(a.id, a.name)} disabled={resetMut.isPending}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(a.id, a.name)} disabled={deleteMut.isPending}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 ml-12 rounded-lg border bg-muted/30 p-3 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Permissions</p>
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium">View prescription templates</p>
                              <p className="text-xs text-muted-foreground">Allow this assistant to see your custom templates</p>
                            </div>
                            <Switch
                              checked={perms.canViewTemplates === true}
                              disabled={updatePerms.isPending}
                              onCheckedChange={v => handleTogglePerm(a.id, "canViewTemplates", v)}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground pt-2 border-t">
                            Assistants can never create, edit, delete templates or sign/edit prescriptions.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
