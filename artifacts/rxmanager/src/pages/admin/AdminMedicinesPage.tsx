import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListMedicines,
  useCreateMedicine,
  useUpdateMedicine,
  useDeleteMedicine,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pill, Plus, Pencil, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MedForm {
  brandName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  manufacturer: string;
}

const emptyForm: MedForm = { brandName: "", genericName: "", strength: "", dosageForm: "", manufacturer: "" };

export default function AdminMedicinesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { data: medicines, refetch, isLoading } = useListMedicines({
    q: search || undefined,
    limit: 50,
  });

  const createMed = useCreateMedicine();
  const updateMed = useUpdateMedicine();
  const deleteMed = useDeleteMedicine();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<MedForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (m: NonNullable<typeof medicines>[number]) => {
    setEditId(m.id);
    setForm({
      brandName: m.brandName ?? "",
      genericName: m.genericName ?? "",
      strength: m.strength ?? "",
      dosageForm: m.dosageForm ?? "",
      manufacturer: m.manufacturer ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.brandName.trim()) { toast({ title: "Brand name is required", variant: "destructive" }); return; }
    const data = {
      brandName: form.brandName.trim(),
      genericName: form.genericName.trim() || undefined,
      strength: form.strength.trim() || undefined,
      dosageForm: form.dosageForm.trim() || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
    };
    try {
      if (editId === null) {
        await createMed.mutateAsync({ data });
        toast({ title: "Medicine added" });
      } else {
        await updateMed.mutateAsync({ id: editId, data });
        toast({ title: "Medicine updated" });
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditId(null);
      refetch();
    } catch {
      toast({ title: "Failed to save medicine", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMed.mutateAsync({ id: deleteTarget.id });
      toast({ title: "Medicine deleted" });
      setDeleteTarget(null);
      refetch();
    } catch {
      toast({ title: "Failed to delete medicine", variant: "destructive" });
    }
  };

  const list = medicines ?? [];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Pill className="h-6 w-6 text-primary" /> Medicines
            </h1>
            <p className="text-muted-foreground mt-1">Manage the medicine database used for prescription autocomplete</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Medicine
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brand, generic, strength, dosage form..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : list.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No medicines found</div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="md:hidden divide-y">
                  {list.map((m) => (
                    <div key={m.id} className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{m.brandName}</p>
                        {m.genericName && <p className="text-xs text-muted-foreground">{m.genericName}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {m.strength && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{m.strength}</span>}
                          {m.dosageForm && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{m.dosageForm}</span>}
                          {m.manufacturer && <span className="text-xs text-muted-foreground">{m.manufacturer}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: m.id, name: m.brandName })} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="p-3 font-medium">Brand</th>
                        <th className="p-3 font-medium">Generic</th>
                        <th className="p-3 font-medium">Strength</th>
                        <th className="p-3 font-medium">Dosage Form</th>
                        <th className="p-3 font-medium">Manufacturer</th>
                        <th className="p-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((m) => (
                        <tr key={m.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{m.brandName}</td>
                          <td className="p-3 text-muted-foreground">{m.genericName || "—"}</td>
                          <td className="p-3">{m.strength || "—"}</td>
                          <td className="p-3">{m.dosageForm || "—"}</td>
                          <td className="p-3 text-muted-foreground">{m.manufacturer || "—"}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(m)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: m.id, name: m.brandName })} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {list.length > 0 && (
          <p className="text-xs text-muted-foreground">Showing {list.length} medicine{list.length === 1 ? "" : "s"}{search ? ` matching "${search}"` : ""}.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId === null ? "Add Medicine" : "Edit Medicine"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input id="brandName" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} autoFocus />
            </div>
            <div>
              <Label htmlFor="genericName">Generic Name</Label>
              <Input id="genericName" value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="strength">Strength</Label>
                <Input id="strength" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} placeholder="e.g. 500 mg" />
              </div>
              <div>
                <Label htmlFor="dosageForm">Dosage Form</Label>
                <Input id="dosageForm" value={form.dosageForm} onChange={(e) => setForm({ ...form, dosageForm: e.target.value })} placeholder="e.g. Tablet" />
              </div>
            </div>
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input id="manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMed.isPending || updateMed.isPending}>
                {editId === null ? "Add" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete medicine?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deleteTarget?.name}" from the medicine database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMed.isPending}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
