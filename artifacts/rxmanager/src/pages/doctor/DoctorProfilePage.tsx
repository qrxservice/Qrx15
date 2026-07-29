import { useGetDoctorProfile, useUpdateDoctor, useListDepartments, useListSpecialties, useListLocations, useGetDoctorSubscription, useGetPaymentGatewaysStatus, useListCountries, useListCities } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Save, Camera, Trash2, Loader2, Stethoscope, AlertTriangle, Clock } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";
import { ImageCropper } from "@/components/ImageCropper";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";
import { storageUrl, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/storage";

export default function DoctorProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: doctor, refetch } = useGetDoctorProfile();
  const { data: subscription } = useGetDoctorSubscription();
  const { data: gatewayStatus } = useGetPaymentGatewaysStatus();
  const [paying, setPaying] = useState(false);
  const updateDoctor = useUpdateDoctor();
  const { data: departments } = useListDepartments();
  const { data: specialties } = useListSpecialties({ departmentId: undefined });
  const { data: locations } = useListLocations();
  const { data: countries } = useListCountries();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const { data: cities } = useListCities(form.countryId ? { countryId: Number(form.countryId) } : {});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const { uploadFile, isUploading } = useUpload({ getAuthToken: () => localStorage.getItem("auth_token") });
  const [savingPhoto, setSavingPhoto] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file", description: "Use JPG, PNG, or WEBP images.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Maximum image size is 5MB.", variant: "destructive" });
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  };

  const invalidateDoctorQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
    queryClient.invalidateQueries({ queryKey: ["/api/doctors/profile"] });
  };

  const handleCropped = async (file: File) => {
    setCropSrc(null);
    setSavingPhoto(true);
    try {
      const res = await uploadFile(file);
      if (!res) throw new Error("upload failed");
      await updateDoctor.mutateAsync({ id: doctor!.id, data: { photoUrl: res.objectPath } });
      toast({ title: "Photo updated" });
      refetch();
      invalidateDoctorQueries();
    } catch {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setSavingPhoto(true);
    try {
      await updateDoctor.mutateAsync({ id: doctor!.id, data: { photoUrl: "" } });
      toast({ title: "Photo removed" });
      refetch();
      invalidateDoctorQueries();
    } catch {
      toast({ title: "Failed to remove photo", variant: "destructive" });
    } finally {
      setSavingPhoto(false);
    }
  };

  useEffect(() => {
    if (doctor) {
      setForm({
        name: doctor.name || "",
        phone: doctor.phone || "",
        degree: doctor.degree || "",
        departmentId: doctor.departmentId ? String(doctor.departmentId) : "",
        specialtyId: doctor.specialtyId ? String(doctor.specialtyId) : "",
        locationId: doctor.locationId ? String(doctor.locationId) : "",
        countryId: doctor.countryId ? String(doctor.countryId) : "",
        cityId: doctor.cityId ? String(doctor.cityId) : "",
        chamberAddress: doctor.chamberAddress || "",
        visitingTime: doctor.visitingTime || "",
        chamberAddress2: doctor.chamberAddress2 || "",
        visitingTime2: doctor.visitingTime2 || "",
        consultationFee: doctor.consultationFee ? String(doctor.consultationFee) : "",
        about: doctor.about || "",
        education: doctor.education || "",
      });
    }
  }, [doctor]);

  const handleSave = async () => {
    try {
      await updateDoctor.mutateAsync({
        id: doctor!.id,
        data: {
          name: form.name,
          phone: form.phone,
          degree: form.degree,
          departmentId: form.departmentId ? Number(form.departmentId) : undefined,
          specialtyId: form.specialtyId ? Number(form.specialtyId) : undefined,
          locationId: form.locationId ? Number(form.locationId) : undefined,
          countryId: form.countryId ? Number(form.countryId) : undefined,
          cityId: form.cityId ? Number(form.cityId) : undefined,
          chamberAddress: form.chamberAddress,
          visitingTime: form.visitingTime,
          chamberAddress2: form.chamberAddress2,
          visitingTime2: form.visitingTime2,
          consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
          about: form.about,
          education: form.education,
        }
      });
      toast({ title: "Profile updated" });
      setEditing(false);
      refetch();
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
  };

  if (!doctor) return (
    <DashboardLayout role="doctor">
      <div className="py-12 text-center text-muted-foreground">Loading profile...</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your professional information</p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={updateDoctor.isPending}>
                  <Save className="mr-2 h-4 w-4" />{updateDoctor.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />Edit Profile
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Profile Photo</CardTitle></CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center">
                {storageUrl(doctor.photoUrl) ? (
                  <img src={storageUrl(doctor.photoUrl)} alt={doctor.name} className="h-full w-full object-cover" />
                ) : (
                  <Stethoscope className="h-10 w-10 text-primary" />
                )}
                {(isUploading || savingPhoto) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading || savingPhoto}>
                    <Camera className="mr-2 h-4 w-4" />{doctor.photoUrl ? "Change" : "Upload"}
                  </Button>
                  {doctor.photoUrl && (
                    <Button variant="outline" size="sm" onClick={handleRemovePhoto} disabled={isUploading || savingPhoto}>
                      <Trash2 className="mr-2 h-4 w-4" />Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP. Max 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Personal Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                {editing ? <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /> : <p className="text-sm font-medium pt-1">{doctor.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                {editing ? <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /> : <p className="text-sm font-medium pt-1">{doctor.phone || "—"}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Degree(s)</Label>
              {editing ? <Input value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))} /> : <p className="text-sm font-medium pt-1">{doctor.degree || "—"}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Practice Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                {editing ? (
                  <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(Array.isArray(departments) ? departments : []).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <p className="text-sm font-medium pt-1">{doctor.departmentName || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>Specialty</Label>
                {editing ? (
                  <Select value={form.specialtyId} onValueChange={v => setForm(f => ({ ...f, specialtyId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{specialties?.filter(s => !form.departmentId || s.departmentId === Number(form.departmentId)).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <p className="text-sm font-medium pt-1">{doctor.specialtyName || "—"}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                {editing ? (
                  <Select value={form.countryId} onValueChange={v => setForm(f => ({ ...f, countryId: v, cityId: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>{(Array.isArray(countries) ? countries : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.flag ? `${c.flag} ` : ""}{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <p className="text-sm font-medium pt-1">{doctor.countryName || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                {editing ? (
                  <Select value={form.cityId} onValueChange={v => setForm(f => ({ ...f, cityId: v }))} disabled={!form.countryId}>
                    <SelectTrigger><SelectValue placeholder={form.countryId ? "Select city" : "Select country first"} /></SelectTrigger>
                    <SelectContent>{(Array.isArray(cities) ? cities : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <p className="text-sm font-medium pt-1">{doctor.cityName || "—"}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location / Area</Label>
                {editing ? (
                  <Select value={form.locationId} onValueChange={v => setForm(f => ({ ...f, locationId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <p className="text-sm font-medium pt-1">{doctor.locationName || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>Consultation Fee (৳)</Label>
                {editing ? <Input type="number" value={form.consultationFee} onChange={e => setForm(f => ({ ...f, consultationFee: e.target.value }))} /> : <p className="text-sm font-medium pt-1">৳{doctor.consultationFee || "—"}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Chamber Address</Label>
              {editing ? <Input value={form.chamberAddress} onChange={e => setForm(f => ({ ...f, chamberAddress: e.target.value }))} /> : <p className="text-sm font-medium pt-1">{doctor.chamberAddress || "—"}</p>}
            </div>
            <div className="space-y-2">
              <Label>Visiting Time</Label>
              {editing ? <Input value={form.visitingTime} onChange={e => setForm(f => ({ ...f, visitingTime: e.target.value }))} /> : <p className="text-sm font-medium pt-1">{doctor.visitingTime || "—"}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Another Chamber Address</Label>
                {editing ? <Input value={form.chamberAddress2} onChange={e => setForm(f => ({ ...f, chamberAddress2: e.target.value }))} placeholder="Second chamber (optional)" /> : <p className="text-sm font-medium pt-1">{doctor.chamberAddress2 || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>Another Chamber Visiting Time</Label>
                {editing ? <Input value={form.visitingTime2} onChange={e => setForm(f => ({ ...f, visitingTime2: e.target.value }))} placeholder="e.g. Fri 6–9 PM (optional)" /> : <p className="text-sm font-medium pt-1">{doctor.visitingTime2 || "—"}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">About & Education</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>About</Label>
              {editing ? <Textarea value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} rows={3} /> : <p className="text-sm text-muted-foreground pt-1">{doctor.about || "—"}</p>}
            </div>
            <div className="space-y-2">
              <Label>Education</Label>
              {editing ? <Textarea value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} rows={2} /> : <p className="text-sm text-muted-foreground pt-1">{doctor.education || "—"}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">BMDC & Subscription</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">BMDC Number</p><p className="font-medium mt-1">{doctor.bmdcNumber || "—"}</p></div>
              <div><p className="text-muted-foreground">Validity (Years)</p><p className="font-medium mt-1">{doctor.bmdcValidityYears || "—"}</p></div>
              <div><p className="text-muted-foreground">Approval Status</p>
                <Badge className="mt-1" variant={doctor.approvalStatus === "approved" ? "default" : doctor.approvalStatus === "pending" ? "secondary" : "destructive"}>
                  {doctor.approvalStatus}
                </Badge>
              </div>
              <div><p className="text-muted-foreground">Monthly Fee</p>
                <p className="font-medium mt-1">{doctor.subscriptionFee === 0 ? "Free" : `${doctor.currency === "USD" ? "$" : "৳"}${doctor.subscriptionFee}/mo`}</p>
              </div>
            </div>

            {subscription && (
              <div className={`rounded-lg border p-3 text-sm space-y-2 ${
                subscription.status === "expired" ? "border-destructive/40 bg-destructive/5" :
                subscription.status === "active" && subscription.endDate && (() => { const d = Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000); return d > 0 && d <= 30; })()
                  ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30"
                  : subscription.status === "active" ? "border-green-200 bg-green-50/50 dark:bg-green-950/20"
                  : "border-border bg-muted/30"
              }`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-medium">Subscription</span>
                  <Badge variant={
                    subscription.paymentStatus === "paid" ? "default" :
                    subscription.paymentStatus === "free" ? "outline" :
                    subscription.paymentStatus === "expired" ? "destructive" : "secondary"
                  }>{subscription.paymentStatus}</Badge>
                  <Badge variant={
                    subscription.status === "active" ? "default" :
                    subscription.status === "expired" ? "destructive" : "secondary"
                  }>{subscription.status}</Badge>
                </div>

                {subscription.endDate && (() => {
                  const daysLeft = Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000);
                  const expiringSoon = subscription.status === "active" && daysLeft > 0 && daysLeft <= 30;
                  const isExpired = subscription.status === "expired" || (subscription.status === "active" && daysLeft <= 0);
                  return (
                    <div className="flex items-center gap-1.5">
                      {isExpired
                        ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        : expiringSoon
                        ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        : <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                      <span className={
                        isExpired ? "text-destructive font-medium" :
                        expiringSoon ? "text-amber-700 dark:text-amber-400 font-medium" :
                        "text-muted-foreground"
                      }>
                        {isExpired
                          ? `Expired on ${subscription.endDate}`
                          : expiringSoon
                          ? `Expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} — ${subscription.endDate}`
                          : `Valid until ${subscription.endDate}`}
                      </span>
                    </div>
                  );
                })()}

                {(subscription.paymentStatus === "unpaid" || subscription.status === "expired") && (() => {
                  // Pick the first enabled online gateway (SSLCommerz cannot handle USD)
                  const currency = doctor.currency ?? "BDT";
                  const gw = currency !== "USD" && gatewayStatus?.sslcommerz ? "sslcommerz"
                    : gatewayStatus?.shurjopay ? "shurjopay"
                    : gatewayStatus?.aamarpay ? "aamarpay"
                    : null;
                  return (
                    <div className="space-y-2">
                      {gw ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={paying}
                          onClick={async () => {
                            setPaying(true);
                            try {
                              const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
                              const token = localStorage.getItem("auth_token");
                              const res = await fetch(`${apiBase}/api/doctors/me/subscription/pay/${gw}`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                },
                                body: JSON.stringify({ months: 1 }),
                              });
                              const data = await res.json();
                              if (data?.url) { window.location.href = data.url; return; }
                              throw new Error("No URL");
                            } catch {
                              toast({ title: "Online payment unavailable", description: "Please contact the admin to renew your subscription.", variant: "destructive" });
                            } finally {
                              setPaying(false);
                            }
                          }}
                        >
                          {paying ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                          Pay Online
                        </Button>
                      ) : null}
                      <p className="text-amber-700 dark:text-amber-400 text-xs font-medium">
                        {gw ? "Or contact" : "Please contact"} the admin to renew your subscription.
                      </p>
                    </div>
                  );
                })()}

                {subscription.months != null && subscription.monthlyFee != null && (() => {
                  const sym = subscription.currency === "USD" ? "$" : "৳";
                  return (
                    <p className="text-muted-foreground text-xs">
                      Last plan: {subscription.months} month{subscription.months > 1 ? "s" : ""} × {sym}{subscription.monthlyFee} = {sym}{subscription.fee}
                    </p>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <ChangePasswordCard />
      </div>
      <ImageCropper
        open={!!cropSrc}
        src={cropSrc}
        onCancel={() => setCropSrc(null)}
        onCropped={handleCropped}
      />
    </DashboardLayout>
  );
}
