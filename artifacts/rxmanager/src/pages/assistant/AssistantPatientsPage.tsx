import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListAppointments, useListPrescriptions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, Users, Phone, Pill, FlaskConical, ChevronRight, ArrowLeft, Calendar } from "lucide-react";

interface PatientSummary {
  name: string;
  phone: string;
  lastSeen: string;
  visitCount: number;
}

export default function AssistantPatientsPage() {
  const { user } = useAuth();
  const doctorId = user?.doctorId ?? 0;

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);

  // Fetch all appointments to build patient list
  const { data: apptData, isLoading: apptLoading } = useListAppointments(
    { doctorId, limit: 500 },
    { query: { queryKey: ["asst-patients-appts", doctorId], enabled: !!doctorId } },
  );

  // Fetch prescriptions for selected patient
  const { data: prescriptions, isLoading: rxLoading } = useListPrescriptions(
    { patientPhone: selectedPatient?.phone, limit: 50 },
    { query: { queryKey: ["asst-patient-rx", selectedPatient?.phone], enabled: !!selectedPatient } },
  );

  // Build unique patient list from appointments
  const allAppts = apptData?.appointments ?? [];
  const patientMap = new Map<string, PatientSummary>();
  for (const appt of allAppts) {
    const key = appt.patientPhone;
    const existing = patientMap.get(key);
    if (!existing || appt.appointmentDate > existing.lastSeen) {
      patientMap.set(key, {
        name: appt.patientName,
        phone: appt.patientPhone,
        lastSeen: appt.appointmentDate,
        visitCount: (existing?.visitCount ?? 0) + 1,
      });
    } else {
      existing.visitCount += 1;
    }
  }

  const filtered = Array.from(patientMap.values()).filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.phone.includes(q);
  }).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  const rxList: any[] = Array.isArray(prescriptions) ? prescriptions : [];

  if (selectedPatient) {
    return (
      <DashboardLayout role="assistant">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> {selectedPatient.name}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {selectedPatient.phone} · {selectedPatient.visitCount} visit{selectedPatient.visitCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Previous Prescriptions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" /> Previous Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rxLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading prescriptions…</p>
              ) : rxList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No prescriptions found</p>
              ) : (
                <div className="space-y-2">
                  {rxList.map((rx: any) => (
                    <div key={rx.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{rx.referenceNo ?? `Rx #${rx.id}`}</span>
                          <Badge variant={rx.status === "final" ? "default" : "secondary"} className="text-xs">
                            {rx.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {rx.chiefComplaint ?? rx.diagnosis ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(rx.createdAt).toLocaleDateString()}
                          {rx.followUpDate ? ` · Follow-up: ${rx.followUpDate}` : ""}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => window.open(`/verify/${rx.referenceNo}`, "_blank")}
                        disabled={!rx.referenceNo}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investigation History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" /> Investigation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rxList.filter((rx: any) => rx.investigations).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">No investigations recorded</p>
              ) : (
                <div className="space-y-2">
                  {rxList.filter((rx: any) => rx.investigations).map((rx: any) => (
                    <div key={rx.id} className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">{new Date(rx.createdAt).toLocaleDateString()}</p>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap">{rx.investigations}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Appointment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allAppts.filter(a => a.patientPhone === selectedPatient.phone).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">No appointments</p>
              ) : (
                <div className="space-y-2">
                  {allAppts
                    .filter(a => a.patientPhone === selectedPatient.phone)
                    .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate))
                    .slice(0, 10)
                    .map(appt => (
                      <div key={appt.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{appt.appointmentDate} — #{appt.serialNo}</p>
                          <p className="text-xs text-muted-foreground">{appt.complaint ?? "No complaint noted"}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{appt.status ?? "booked"}</Badge>
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

  return (
    <DashboardLayout role="assistant">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Patients
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Search patients and view their records</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {apptLoading ? (
              <p className="text-sm text-muted-foreground p-6 text-center">Loading patients…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">
                {search ? "No patients found" : "No patient records yet"}
              </p>
            ) : (
              <div className="divide-y">
                {filtered.map(p => (
                  <button
                    key={p.phone}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setSelectedPatient(p)}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {p.phone}
                        <span className="mx-1">·</span>
                        {p.visitCount} visit{p.visitCount !== 1 ? "s" : ""}
                        <span className="mx-1">·</span>
                        Last: {p.lastSeen}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

