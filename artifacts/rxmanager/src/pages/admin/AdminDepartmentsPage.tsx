import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
  useListSpecialties, useCreateSpecialty, useDeleteSpecialty,
  useListLocations, useCreateLocation, useDeleteLocation,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Tag, MapPin, Plus, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDepartmentsPage() {
  const { toast } = useToast();

  // Departments
  const { data: departments, refetch: refetchDepts } = useListDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();
  const [deptDialog, setDeptDialog] = useState(false);
  const [editDept, setEditDept] = useState<{ id: number; name: string; icon?: string | null; description?: string | null } | null>(null);
  const [deptForm, setDeptForm] = useState({ name: "", icon: "", description: "" });

  // Specialties
  const { data: specialties, refetch: refetchSpecs } = useListSpecialties({});
  const createSpec = useCreateSpecialty();
  const deleteSpec = useDeleteSpecialty();
  const [specDialog, setSpecDialog] = useState(false);
  const [specForm, setSpecForm] = useState({ name: "", departmentId: "" });

  // Locations
  const { data: locations, refetch: refetchLocs } = useListLocations();
  const createLoc = useCreateLocation();
  const deleteLoc = useDeleteLocation();
  const [locDialog, setLocDialog] = useState(false);
  const [locForm, setLocForm] = useState({ name: "", district: "" });

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editDept) {
        await updateDept.mutateAsync({ id: editDept.id, data: { name: deptForm.name, icon: deptForm.icon || undefined, description: deptForm.description || undefined } });
        toast({ title: "Department updated" });
      } else {
        await createDept.mutateAsync({ data: { name: deptForm.name, icon: deptForm.icon || undefined, description: deptForm.description || undefined } });
        toast({ title: "Department created" });
      }
      refetchDepts();
      setDeptDialog(false);
      setDeptForm({ name: "", icon: "", description: "" });
      setEditDept(null);
    } catch {
      toast({ title: "Failed to save department", variant: "destructive" });
    }
  };

  const handleDeptDelete = async (id: number) => {
    if (!confirm("Delete this department?")) return;
    try { await deleteDept.mutateAsync({ id }); toast({ title: "Deleted" }); refetchDepts(); }
    catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const handleSpecSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specForm.departmentId) return;
    try {
      await createSpec.mutateAsync({ data: { name: specForm.name, departmentId: Number(specForm.departmentId) } });
      toast({ title: "Specialty added" });
      refetchSpecs();
      setSpecDialog(false);
      setSpecForm({ name: "", departmentId: "" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleSpecDelete = async (id: number) => {
    if (!confirm("Delete this specialty?")) return;
    try { await deleteSpec.mutateAsync({ id }); toast({ title: "Deleted" }); refetchSpecs(); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleLocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLoc.mutateAsync({ data: { name: locForm.name, district: locForm.district || undefined } });
      toast({ title: "Location added" });
      refetchLocs();
      setLocDialog(false);
      setLocForm({ name: "", district: "" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleLocDelete = async (id: number) => {
    if (!confirm("Delete this location?")) return;
    try { await deleteLoc.mutateAsync({ id }); toast({ title: "Deleted" }); refetchLocs(); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Departments, Specialties & Locations</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage the classification system for doctors</p>
        </div>

        <Tabs defaultValue="departments">
          <TabsList>
            <TabsTrigger value="departments"><Building className="h-4 w-4 mr-1.5" />Departments ({departments?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="specialties"><Tag className="h-4 w-4 mr-1.5" />Specialties ({specialties?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="locations"><MapPin className="h-4 w-4 mr-1.5" />Locations ({locations?.length ?? 0})</TabsTrigger>
          </TabsList>

          {/* DEPARTMENTS */}
          <TabsContent value="departments" className="mt-4 space-y-4">
            <Button size="sm" onClick={() => { setEditDept(null); setDeptForm({ name: "", icon: "", description: "" }); setDeptDialog(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />Add Department
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {departments?.map(dept => (
                <Card key={dept.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {dept.icon && <span className="text-2xl shrink-0">{dept.icon}</span>}
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{dept.name}</p>
                        {dept.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{dept.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setEditDept(dept); setDeptForm({ name: dept.name, icon: dept.icon ?? "", description: dept.description ?? "" }); setDeptDialog(true);
                      }}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeptDelete(dept.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* SPECIALTIES */}
          <TabsContent value="specialties" className="mt-4 space-y-4">
            <Button size="sm" onClick={() => setSpecDialog(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />Add Specialty
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {specialties?.map(spec => {
                const dept = departments?.find(d => d.id === spec.departmentId);
                return (
                  <Card key={spec.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{spec.name}</p>
                        {dept && <Badge variant="secondary" className="text-xs mt-0.5">{dept.name}</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => handleSpecDelete(spec.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* LOCATIONS */}
          <TabsContent value="locations" className="mt-4 space-y-4">
            <Button size="sm" onClick={() => setLocDialog(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />Add Location
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {locations?.map(loc => (
                <Card key={loc.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{loc.name}</p>
                      {loc.district && <p className="text-xs text-muted-foreground">{loc.district}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => handleLocDelete(loc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Department dialog */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editDept ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
          <form onSubmit={handleDeptSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2"><Label>Name *</Label><Input required value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cardiology" /></div>
              <div className="space-y-1.5">
                <Label>Symbol</Label>
                <div className="relative">
                  <Input value={deptForm.icon} onChange={e => setDeptForm(f => ({ ...f, icon: e.target.value }))} placeholder="🫀" className="text-center text-xl pr-2" />
                  {deptForm.icon && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">preview</span>}
                </div>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={deptForm.description} onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
            <Button type="submit" className="w-full" disabled={createDept.isPending || updateDept.isPending}>Save</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Specialty dialog */}
      <Dialog open={specDialog} onOpenChange={setSpecDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Specialty</DialogTitle></DialogHeader>
          <form onSubmit={handleSpecSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select value={specForm.departmentId} onValueChange={v => setSpecForm(f => ({ ...f, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments?.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Specialty Name *</Label><Input required value={specForm.name} onChange={e => setSpecForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Interventional Cardiology" /></div>
            <Button type="submit" className="w-full" disabled={createSpec.isPending}>Save</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Location dialog */}
      <Dialog open={locDialog} onOpenChange={setLocDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
          <form onSubmit={handleLocSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label>Name *</Label><Input required value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dhanmondi, Dhaka" /></div>
            <div className="space-y-1.5"><Label>District</Label><Input value={locForm.district} onChange={e => setLocForm(f => ({ ...f, district: e.target.value }))} placeholder="e.g. Dhaka" /></div>
            <Button type="submit" className="w-full" disabled={createLoc.isPending}>Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
