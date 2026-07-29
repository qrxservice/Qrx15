import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem,
  getListMenuItemsQueryKey,
} from "@workspace/api-client-react";
import type { MenuItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link2, Pencil, Trash2, Plus, X, ExternalLink } from "lucide-react";

type Location = "header" | "footer" | "both";
const EMPTY = { label: "", url: "", location: "header" as Location, displayOrder: 0, openInNewTab: false, isActive: true };

export default function AdminMenuPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: items } = useListMenuItems({ all: "true" });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey({ all: "true" }) });

  const createMut = useCreateMenuItem({ mutation: { onSuccess: invalidate } });
  const updateMut = useUpdateMenuItem({ mutation: { onSuccess: invalidate } });
  const deleteMut = useDeleteMenuItem({ mutation: { onSuccess: invalidate } });

  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (m: MenuItem) => {
    setEditing(m);
    setForm({
      label: m.label, url: m.url,
      location: (m.location === "footer" || m.location === "both" ? m.location : "header") as Location,
      displayOrder: m.displayOrder ?? 0, openInNewTab: m.openInNewTab ?? false, isActive: m.isActive,
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };

  const handleSave = async () => {
    if (!form.label.trim() || !form.url.trim()) { toast({ title: "Label and URL are required", variant: "destructive" }); return; }
    const data = {
      label: form.label.trim(), url: form.url.trim(), location: form.location,
      displayOrder: Number(form.displayOrder) || 0, openInNewTab: form.openInNewTab, isActive: form.isActive,
    };
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, data });
      else await createMut.mutateAsync({ data });
      toast({ title: editing ? "Link updated" : "Link created" });
      closeForm();
    } catch { toast({ title: "Failed to save link", variant: "destructive" }); }
  };

  const handleDelete = async (m: MenuItem) => {
    if (!confirm(`Delete "${m.label}"?`)) return;
    try { await deleteMut.mutateAsync({ id: m.id }); toast({ title: "Link deleted" }); }
    catch { toast({ title: "Failed to delete link", variant: "destructive" }); }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Link2 className="h-6 w-6 text-primary" />Menu Links</h1>
            <p className="text-muted-foreground text-sm mt-1">Add custom links to the public site header and footer.</p>
          </div>
          {!showForm && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />New Link</Button>}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                {editing ? "Edit Link" : "New Link"}
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="h-4 w-4" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Label</Label><Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="About Us" /></div>
                <div className="space-y-1.5"><Label>URL</Label><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="/about or https://…" /></div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Select value={form.location} onValueChange={v => setForm(f => ({ ...f, location: v as Location }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="footer">Footer</SelectItem>
                      <SelectItem value="both">Header &amp; Footer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Display order</Label><Input type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))} /></div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="newTab" className="flex flex-col gap-0.5"><span>Open in new tab</span><span className="text-xs font-normal text-muted-foreground">Useful for external links</span></Label>
                <Switch id="newTab" checked={form.openInNewTab} onCheckedChange={v => setForm(f => ({ ...f, openInNewTab: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active" className="flex flex-col gap-0.5"><span>Active</span><span className="text-xs font-normal text-muted-foreground">When off, the link is hidden</span></Label>
                <Switch id="active" checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>{editing ? "Update Link" : "Create Link"}</Button>
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">All Links</CardTitle></CardHeader>
          <CardContent>
            {!items || items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No custom links yet. Click "New Link" to add one.</p>
            ) : (
              <div className="divide-y">
                {items.map(m => (
                  <div key={m.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate flex items-center gap-1.5">{m.label}{m.openInNewTab && <ExternalLink className="h-3 w-3 text-muted-foreground" />}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.url}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{m.location}</Badge>
                    <Badge variant={m.isActive ? "default" : "secondary"}>{m.isActive ? "Active" : "Hidden"}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(m)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
