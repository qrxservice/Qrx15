import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useAdminEmergencyContacts, useCreateEmergencyContact, useUpdateEmergencyContact,
  useDeleteEmergencyContact, useToggleVerifyEmergencyContact,
  EMERGENCY_CATEGORIES, categoryLabel, type EmergencyContact,
} from "@/lib/emergency-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Ambulance, Pencil, Trash2, Plus, X, ShieldCheck, Star, Phone, AlertTriangle } from "lucide-react";
import { COUNTRIES, BD_DIVISIONS, districtsForDivision, upazilasForDistrict } from "@/lib/bd-locations";

const EMPTY = {
  category: "ambulance", name: "", mobileNumber: "", driverName: "", vehicleNumber: "",
  country: "Bangladesh", division: "", district: "", upazila: "", area: "", notes: "",
  availabilityStatus: "available" as "available" | "busy" | "offline",
  isVerified: false, isPriority: false, isActive: true,
};

export default function AdminEmergencyContactsPage() {
  const { toast } = useToast();
  const { data: contacts } = useAdminEmergencyContacts();
  const createMut = useCreateEmergencyContact();
  const updateMut = useUpdateEmergencyContact();
  const deleteMut = useDeleteEmergencyContact();
  const verifyMut = useToggleVerifyEmergencyContact();

  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filterCategory, setFilterCategory] = useState("all");
  const isBangladesh = (form.country || "Bangladesh") === "Bangladesh";

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (c: EmergencyContact) => {
    setEditing(c);
    setForm({
      category: c.category, name: c.name, mobileNumber: c.mobileNumber,
      driverName: c.driverName ?? "", vehicleNumber: c.vehicleNumber ?? "",
      country: c.country, division: c.division ?? "", district: c.district ?? "",
      upazila: c.upazila ?? "", area: c.area ?? "", notes: c.notes ?? "",
      availabilityStatus: c.availabilityStatus, isVerified: c.isVerified,
      isPriority: c.isPriority, isActive: c.isActive,
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.mobileNumber.trim()) {
      toast({ title: "Name and mobile number are required", variant: "destructive" }); return;
    }
    const data = {
      ...form,
      name: form.name.trim(), mobileNumber: form.mobileNumber.trim(),
      driverName: form.driverName.trim() || null,
      vehicleNumber: form.vehicleNumber.trim() || null,
      country: form.country || "Bangladesh",
      division: form.division.trim() || null, district: form.district.trim() || null,
      upazila: form.upazila.trim() || null, area: form.area.trim() || null,
      notes: form.notes.trim() || null,
    };
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, data });
      else await createMut.mutateAsync(data);
      toast({ title: editing ? "Contact updated" : "Contact created" });
      closeForm();
    } catch { toast({ title: "Failed to save contact", variant: "destructive" }); }
  };

  const handleDelete = async (c: EmergencyContact) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try { await deleteMut.mutateAsync(c.id); toast({ title: "Contact deleted" }); }
    catch { toast({ title: "Failed to delete contact", variant: "destructive" }); }
  };

  const list = (Array.isArray(contacts) ? contacts : []).filter(c => filterCategory === "all" || c.category === filterCategory);
  const isAmbulance = form.category === "ambulance";

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Ambulance className="h-6 w-6 text-primary" />Emergency Contact Directory</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage ambulance, oxygen, blood donor, and other emergency contacts shown on the public site.</p>
          </div>
          {!showForm && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />New Contact</Button>}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                {editing ? "Edit Contact" : "New Contact"}
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="h-4 w-4" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMERGENCY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Name / Facility</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="City Ambulance Service" /></div>
                <div className="space-y-1.5"><Label>Mobile Number</Label><Input value={form.mobileNumber} onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value }))} placeholder="01xxxxxxxxx" /></div>
                {isAmbulance && (
                  <>
                    <div className="space-y-1.5"><Label>Driver Name</Label><Input value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Vehicle Number</Label><Input value={form.vehicleNumber} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))} /></div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select
                    value={form.country || "Bangladesh"}
                    onValueChange={v => setForm(f => ({ ...f, country: v, division: "", district: "", upazila: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {isBangladesh ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>Division</Label>
                      <Select value={form.division || "none"} onValueChange={v => setForm(f => ({ ...f, division: v === "none" ? "" : v, district: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          {BD_DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>District</Label>
                      <Select value={form.district || "none"} onValueChange={v => setForm(f => ({ ...f, district: v === "none" ? "" : v, upazila: "" }))} disabled={!form.division}>
                        <SelectTrigger><SelectValue placeholder={form.division ? "Select district" : "Select division first"} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          {districtsForDivision(form.division).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Upazila</Label>
                      <Select value={form.upazila || "none"} onValueChange={v => setForm(f => ({ ...f, upazila: v === "none" ? "" : v }))} disabled={!form.district}>
                        <SelectTrigger><SelectValue placeholder={form.district ? "Select upazila" : "Select district first"} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          {upazilasForDistrict(form.district).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5"><Label>State / Region</Label><Input value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} placeholder="e.g. California" /></div>
                    <div className="space-y-1.5"><Label>City</Label><Input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="e.g. Los Angeles" /></div>
                  </>
                )}
                <div className="space-y-1.5"><Label>Area</Label><Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. Dhanmondi" /></div>
                <div className="space-y-1.5">
                  <Label>Availability</Label>
                  <Select value={form.availabilityStatus} onValueChange={v => setForm(f => ({ ...f, availabilityStatus: v as typeof f.availabilityStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available Now</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <Label htmlFor="verified" className="text-sm">Verified</Label>
                  <Switch id="verified" checked={form.isVerified} onCheckedChange={v => setForm(f => ({ ...f, isVerified: v }))} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <Label htmlFor="priority" className="text-sm">Priority</Label>
                  <Switch id="priority" checked={form.isPriority} onCheckedChange={v => setForm(f => ({ ...f, isPriority: v }))} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <Label htmlFor="active" className="text-sm">Active</Label>
                  <Switch id="active" checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>{editing ? "Update Contact" : "Create Contact"}</Button>
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">All Contacts ({list.length})</CardTitle>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EMERGENCY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No emergency contacts yet. Click "New Contact" to add one.</p>
            ) : (
              <div className="divide-y">
                {list.map(c => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate flex items-center gap-1.5">
                        {c.name}
                        {c.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                        {c.isPriority && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                        {c.reportCount > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-destructive"><AlertTriangle className="h-3 w-3" />{c.reportCount}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Phone className="h-3 w-3" />{c.mobileNumber} · {[c.area, c.district, c.division].filter(Boolean).join(", ") || c.country}</p>
                    </div>
                    <Badge variant="outline">{categoryLabel(c.category)}</Badge>
                    <Badge variant={c.availabilityStatus === "available" ? "default" : "secondary"} className="capitalize">{c.availabilityStatus}</Badge>
                    <Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Active" : "Hidden"}</Badge>
                    <Button variant="ghost" size="icon" title="Toggle verified" onClick={() => verifyMut.mutate(c.id)}><ShieldCheck className={`h-4 w-4 ${c.isVerified ? "text-blue-500" : ""}`} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c)}><Trash2 className="h-4 w-4" /></Button>
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
