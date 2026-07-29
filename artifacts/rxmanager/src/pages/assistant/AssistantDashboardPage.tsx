import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListAppointments, useCreateAppointment, useUpdateAppointment,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MAX_UPLOAD_BYTES, downloadObject } from "@/lib/storage";
import {
  CalendarPlus, Activity, Save, Phone, User, ClipboardList, Stethoscope,
  Upload, FileText, Loader2, X, Download, History,
} from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];

const emptyBooking = () => ({
  patientName: "", patientPhone: "", patientAge: "", patientGender: "Male",
  complaint: "", appointmentTime: "",
  bp: "", pulse: "", temp: "", weight: "", height: "",
  hb: "", sugar: "", spo2: "", medicalHistory: "", notes: "",
  labReportUrl: "", prescriptionUploadUrl: "",
});

const emptyVitals = () => ({
  bp: "", pulse: "", temp: "", weight: "", height: "",
  hb: "", sugar: "", spo2: "", medicalHistory: "", notes: "",
  labReportUrl: "", prescriptionUploadUrl: "",
});

function DocUpload({
  label, value, onChange,
}: { label: string; value: string; onChange: (path: string) => void }) {
  const { uploadFile, isUploading } = useUpload({ getAuthToken: () => localStorage.getItem("auth_token") });
  const { toast } = useToast();

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" });
      return;
    }
    const res = await uploadFile(file);
    if (res) {
      onChange(res.objectPath);
      toast({ title: `${label} uploaded` });
    } else {
      toast({ title: `Failed to upload ${label.toLowerCase()}`, variant: "destructive" });
    }
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {value ? (
        <div className="mt-1 flex items-center gap-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-teal-600" />
          <button type="button" className="text-teal-700 dark:text-teal-400 underline" onClick={() => downloadObject(value, label)}>
            View uploaded file
          </button>
          <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => onChange("")}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {isUploading ? "Uploading..." : "Upload PDF / image"}
          <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleSelect} disabled={isUploading} />
        </label>
      )}
    </div>
  );
}

export default function AssistantDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const doctorId = user?.doctorId ?? 0;

  const { data, refetch, isLoading } = useListAppointments(
    { doctorId, date: today(), limit: 100 },
    { query: { queryKey: ["assistant-appointments", doctorId], enabled: !!doctorId } },
  );
  const createMut = useCreateAppointment();
  const updateMut = useUpdateAppointment();

  const [booking, setBooking] = useState(emptyBooking());
  const [editId, setEditId] = useState<number | null>(null);
  const [vitals, setVitals] = useState(emptyVitals());

  const appointments = data?.appointments ?? [];

  const handleCreate = async () => {
    if (!booking.patientName.trim() || !booking.patientPhone.trim()) {
      toast({ title: "Patient name and phone are required", variant: "destructive" });
      return;
    }
    try {
      await createMut.mutateAsync({
        data: {
          doctorId,
          patientName: booking.patientName,
          patientPhone: booking.patientPhone,
          patientAge: booking.patientAge ? Number(booking.patientAge) : undefined,
          patientGender: booking.patientGender,
          complaint: booking.complaint || undefined,
          appointmentDate: today(),
          appointmentTime: booking.appointmentTime || undefined,
          bookingSource: "offline",
          bp: booking.bp || undefined,
          pulse: booking.pulse || undefined,
          temp: booking.temp || undefined,
          weight: booking.weight || undefined,
          height: booking.height || undefined,
          hb: booking.hb || undefined,
          sugar: booking.sugar || undefined,
          spo2: booking.spo2 || undefined,
          medicalHistory: booking.medicalHistory || undefined,
          notes: booking.notes || undefined,
          labReportUrl: booking.labReportUrl || undefined,
          prescriptionUploadUrl: booking.prescriptionUploadUrl || undefined,
        },
      });
      toast({ title: "Offline booking added" });
      setBooking(emptyBooking());
      refetch();
    } catch {
      toast({ title: "Failed to add booking", variant: "destructive" });
    }
  };

  const startEditVitals = (appt: (typeof appointments)[0]) => {
    setEditId(appt.id);
    setVitals({
      bp: appt.bp ?? "", pulse: appt.pulse ?? "", temp: appt.temp ?? "",
      weight: appt.weight ?? "", height: appt.height ?? "",
      hb: appt.hb ?? "", sugar: appt.sugar ?? "", spo2: appt.spo2 ?? "",
      medicalHistory: appt.medicalHistory ?? "", notes: appt.notes ?? "",
      labReportUrl: appt.labReportUrl ?? "", prescriptionUploadUrl: appt.prescriptionUploadUrl ?? "",
    });
  };

  const handleSaveVitals = async (id: number) => {
    try {
      await updateMut.mutateAsync({ id, data: vitals });
      toast({ title: "Saved — will auto-fill in the doctor's prescription" });
      setEditId(null);
      setVitals(emptyVitals());
      refetch();
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout role="assistant">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" /> Today's Bookings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your doctor's appointments, add walk-in / offline bookings, record vitals, history & documents. Everything auto-fills into the doctor's prescription.
          </p>
        </div>

        {/* Add offline booking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" /> Add walk-in / offline booking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Patient name *</label>
                <Input className="mt-1" placeholder="Name" value={booking.patientName} onChange={e => setBooking(b => ({ ...b, patientName: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Phone *</label>
                <Input className="mt-1" placeholder="01XXXXXXXXX" value={booking.patientPhone} onChange={e => setBooking(b => ({ ...b, patientPhone: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Age</label>
                  <Input className="mt-1" type="number" placeholder="25" value={booking.patientAge} onChange={e => setBooking(b => ({ ...b, patientAge: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Gender</label>
                  <select className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={booking.patientGender} onChange={e => setBooking(b => ({ ...b, patientGender: e.target.value }))}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Chief complaint</label>
              <Textarea className="mt-1 min-h-[44px]" placeholder="Reason for visit..." value={booking.complaint} onChange={e => setBooking(b => ({ ...b, complaint: e.target.value }))} />
            </div>
            <div>
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5 mb-1.5">
                <Activity className="h-3.5 w-3.5" /> Vitals (optional)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input placeholder="BP 120/80" value={booking.bp} onChange={e => setBooking(b => ({ ...b, bp: e.target.value }))} />
                <Input placeholder="Pulse 72" value={booking.pulse} onChange={e => setBooking(b => ({ ...b, pulse: e.target.value }))} />
                <Input placeholder="Temp 98.6" value={booking.temp} onChange={e => setBooking(b => ({ ...b, temp: e.target.value }))} />
                <Input placeholder="SpO2 98%" value={booking.spo2} onChange={e => setBooking(b => ({ ...b, spo2: e.target.value }))} />
                <Input placeholder="Wt 65kg" value={booking.weight} onChange={e => setBooking(b => ({ ...b, weight: e.target.value }))} />
                <Input placeholder="Ht 170cm" value={booking.height} onChange={e => setBooking(b => ({ ...b, height: e.target.value }))} />
                <Input placeholder="Hb 13.5" value={booking.hb} onChange={e => setBooking(b => ({ ...b, hb: e.target.value }))} />
                <Input placeholder="Sugar 5.6" value={booking.sugar} onChange={e => setBooking(b => ({ ...b, sugar: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><History className="h-3 w-3" /> Medical history</label>
                <Textarea className="mt-1 min-h-[44px]" placeholder="Past conditions, allergies, current medications..." value={booking.medicalHistory} onChange={e => setBooking(b => ({ ...b, medicalHistory: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes for doctor</label>
                <Textarea className="mt-1 min-h-[44px]" placeholder="On examination / extra notes..." value={booking.notes} onChange={e => setBooking(b => ({ ...b, notes: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DocUpload label="Lab report" value={booking.labReportUrl} onChange={p => setBooking(b => ({ ...b, labReportUrl: p }))} />
              <DocUpload label="Previous prescription" value={booking.prescriptionUploadUrl} onChange={p => setBooking(b => ({ ...b, prescriptionUploadUrl: p }))} />
            </div>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              <CalendarPlus className="h-4 w-4 mr-1.5" /> Add booking
            </Button>
          </CardContent>
        </Card>

        {/* Today's bookings list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Today's appointments ({appointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!doctorId ? (
              <p className="text-sm text-destructive py-4">Your account is not linked to a doctor. Ask your doctor to recreate your account.</p>
            ) : isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading...</p>
            ) : !appointments.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No bookings for today yet.</p>
            ) : (
              <div className="divide-y">
                {appointments.map(appt => {
                  const hasVitals = appt.bp || appt.pulse || appt.temp || appt.weight || appt.height || appt.hb || appt.sugar || appt.spo2;
                  const hasDocs = appt.labReportUrl || appt.prescriptionUploadUrl;
                  return (
                    <div key={appt.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm flex items-center gap-2">
                            <span className="text-muted-foreground">#{appt.serialNo}</span>
                            <User className="h-3.5 w-3.5 text-muted-foreground" /> {appt.patientName}
                            {appt.bookingSource === "offline" && <Badge variant="secondary" className="text-[10px]">Offline</Badge>}
                            {hasVitals && <Badge className="text-[10px] bg-green-600 hover:bg-green-600">Vitals ✓</Badge>}
                            {hasDocs && <Badge className="text-[10px] bg-blue-600 hover:bg-blue-600">Docs ✓</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {appt.patientPhone}
                            {appt.patientAge != null && <span>· {appt.patientAge}{appt.patientGender ? ` / ${appt.patientGender}` : ""}</span>}
                          </p>
                          {appt.complaint && <p className="text-xs mt-1">{appt.complaint}</p>}
                          {hasVitals && editId !== appt.id && (
                            <p className="text-xs text-teal-700 dark:text-teal-400 mt-1 font-mono">
                              {[appt.bp && `BP ${appt.bp}`, appt.pulse && `P ${appt.pulse}`, appt.temp && `T ${appt.temp}`, appt.spo2 && `SpO2 ${appt.spo2}`, appt.weight && `Wt ${appt.weight}`, appt.height && `Ht ${appt.height}`, appt.hb && `Hb ${appt.hb}`, appt.sugar && `Sugar ${appt.sugar}`].filter(Boolean).join("  ·  ")}
                            </p>
                          )}
                          {appt.medicalHistory && editId !== appt.id && (
                            <p className="text-xs mt-1"><span className="text-muted-foreground">History:</span> {appt.medicalHistory}</p>
                          )}
                          {hasDocs && editId !== appt.id && (
                            <div className="flex flex-wrap gap-3 mt-1.5">
                              {appt.labReportUrl && (
                                <button type="button" className="text-xs text-blue-600 dark:text-blue-400 underline flex items-center gap-1" onClick={() => downloadObject(appt.labReportUrl, "lab-report")}>
                                  <Download className="h-3 w-3" /> Lab report
                                </button>
                              )}
                              {appt.prescriptionUploadUrl && (
                                <button type="button" className="text-xs text-blue-600 dark:text-blue-400 underline flex items-center gap-1" onClick={() => downloadObject(appt.prescriptionUploadUrl, "prescription")}>
                                  <Download className="h-3 w-3" /> Prescription
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {editId !== appt.id && (
                          <Button variant="outline" size="sm" onClick={() => startEditVitals(appt)}>
                            <Activity className="h-3.5 w-3.5 mr-1" /> {hasVitals || hasDocs ? "Edit" : "Add vitals"}
                          </Button>
                        )}
                      </div>

                      {editId === appt.id && (
                        <div className="mt-3 p-3 rounded-lg border bg-muted/30 space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Input placeholder="BP 120/80" value={vitals.bp} onChange={e => setVitals(v => ({ ...v, bp: e.target.value }))} />
                            <Input placeholder="Pulse 72" value={vitals.pulse} onChange={e => setVitals(v => ({ ...v, pulse: e.target.value }))} />
                            <Input placeholder="Temp 98.6" value={vitals.temp} onChange={e => setVitals(v => ({ ...v, temp: e.target.value }))} />
                            <Input placeholder="SpO2 98%" value={vitals.spo2} onChange={e => setVitals(v => ({ ...v, spo2: e.target.value }))} />
                            <Input placeholder="Wt 65kg" value={vitals.weight} onChange={e => setVitals(v => ({ ...v, weight: e.target.value }))} />
                            <Input placeholder="Ht 170cm" value={vitals.height} onChange={e => setVitals(v => ({ ...v, height: e.target.value }))} />
                            <Input placeholder="Hb 13.5" value={vitals.hb} onChange={e => setVitals(v => ({ ...v, hb: e.target.value }))} />
                            <Input placeholder="Sugar 5.6" value={vitals.sugar} onChange={e => setVitals(v => ({ ...v, sugar: e.target.value }))} />
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Textarea className="min-h-[44px]" placeholder="Medical history..." value={vitals.medicalHistory} onChange={e => setVitals(v => ({ ...v, medicalHistory: e.target.value }))} />
                            <Textarea className="min-h-[44px]" placeholder="Notes for doctor..." value={vitals.notes} onChange={e => setVitals(v => ({ ...v, notes: e.target.value }))} />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <DocUpload label="Lab report" value={vitals.labReportUrl} onChange={p => setVitals(v => ({ ...v, labReportUrl: p }))} />
                            <DocUpload label="Previous prescription" value={vitals.prescriptionUploadUrl} onChange={p => setVitals(v => ({ ...v, prescriptionUploadUrl: p }))} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveVitals(appt.id)} disabled={updateMut.isPending}>
                              <Save className="h-3.5 w-3.5 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setVitals(emptyVitals()); }}>Cancel</Button>
                          </div>
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
