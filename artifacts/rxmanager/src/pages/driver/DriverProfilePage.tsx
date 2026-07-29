import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDriverProfile, useUpdateDriverProfile, useAddVehicle, VEHICLE_TYPES, type VehicleType } from "@/lib/ambulance-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ambulance, Star, PlusCircle } from "lucide-react";
import { DriverLayout } from "@/components/layout/DriverLayout";
// ArrowLeft and Link no longer needed — layout handles nav

export default function DriverProfilePage() {
  const { toast } = useToast();
  const { data: driver, isLoading } = useDriverProfile();
  const updateProfile = useUpdateDriverProfile();
  const addVehicle = useAddVehicle();
  const [editing, setEditing] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [vehicleForm, setVehicleForm] = useState<{ vehicleType: VehicleType; registrationNumber: string; make: string; model: string }>({ vehicleType: "basic", registrationNumber: "", make: "", model: "" });

  const startEdit = () => {
    if (!driver) return;
    setForm({ name: driver.name, phone: driver.phone });
    setEditing(true);
  };

  const saveProfile = () => {
    updateProfile.mutate(form, {
      onSuccess: () => { toast({ title: "Profile updated" }); setEditing(false); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const saveVehicle = () => {
    if (!vehicleForm.registrationNumber) { toast({ title: "Registration number required", variant: "destructive" }); return; }
    addVehicle.mutate(vehicleForm, {
      onSuccess: () => { toast({ title: "Vehicle added" }); setAddingVehicle(false); setVehicleForm({ vehicleType: "basic", registrationNumber: "", make: "", model: "" }); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Ambulance className="animate-pulse h-8 w-8 text-red-500" /></div>;
  if (!driver) return null;

  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="font-bold text-xl">Driver Profile</h1>
        {/* Profile Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Personal Info</CardTitle>
              <Badge className={driver.approvalStatus === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                {driver.approvalStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveProfile} disabled={updateProfile.isPending}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Name</span><p className="font-medium">{driver.name}</p></div>
                  <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{driver.phone}</p></div>
                  <div><span className="text-muted-foreground">Email</span><p className="font-medium">{driver.email}</p></div>
                  <div><span className="text-muted-foreground">NID</span><p className="font-medium">{driver.nidNumber ?? "—"}</p></div>
                  <div><span className="text-muted-foreground">Licence</span><p className="font-medium">{driver.licenceNumber ?? "—"}</p></div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{driver.avgRating?.toFixed(1) ?? "—"}</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={startEdit}>Edit Profile</Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Vehicles */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Vehicles</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setAddingVehicle(v => !v)}>
                <PlusCircle className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {addingVehicle && (
              <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
                <div className="space-y-1">
                  <Label>Vehicle Type</Label>
                  <Select value={vehicleForm.vehicleType} onValueChange={v => setVehicleForm(f => ({ ...f, vehicleType: v as VehicleType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Registration No. *</Label>
                    <Input value={vehicleForm.registrationNumber} onChange={e => setVehicleForm(f => ({ ...f, registrationNumber: e.target.value }))} placeholder="e.g. DHA-1234" />
                  </div>
                  <div className="space-y-1">
                    <Label>Make</Label>
                    <Input value={vehicleForm.make} onChange={e => setVehicleForm(f => ({ ...f, make: e.target.value }))} placeholder="e.g. Toyota" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveVehicle} disabled={addVehicle.isPending}>Add Vehicle</Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingVehicle(false)}>Cancel</Button>
                </div>
              </div>
            )}
            {driver.vehicles?.length === 0 && !addingVehicle && (
              <p className="text-sm text-muted-foreground text-center py-2">No vehicles registered yet.</p>
            )}
            {driver.vehicles?.map(v => (
              <div key={v.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="font-medium text-sm">{VEHICLE_TYPES.find(t => t.value === v.vehicleType)?.icon} {VEHICLE_TYPES.find(t => t.value === v.vehicleType)?.label}</p>
                  <p className="text-xs text-muted-foreground">{v.registrationNumber}{v.make ? ` · ${v.make}` : ""}</p>
                </div>
                <Badge className={v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                  {v.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DriverLayout>
  );
}
