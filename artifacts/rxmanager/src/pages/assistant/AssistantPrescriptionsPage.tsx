import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListPrescriptions, useGetPrescription } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Search, Printer, ArrowLeft, User, Phone, Calendar,
  FlaskConical, Stethoscope, Pill, ChevronRight,
} from "lucide-react";

export default function AssistantPrescriptionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = useListPrescriptions(
    { page, limit: 30 },
    { query: { queryKey: ["asst-rx-list", page] } },
  );
  const { data: detail } = useGetPrescription(
    selectedId!,
    { query: { queryKey: ["asst-rx-detail", selectedId], enabled: selectedId !== null } },
  );

  const list: any[] = Array.isArray(data) ? data : [];

  const filtered = list.filter(rx => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      rx.patientName?.toLowerCase().includes(q) ||
      rx.patientPhone?.includes(q) ||
      rx.referenceNo?.toLowerCase().includes(q)
    );
  });

  const handlePrint = () => {
    window.print();
  };

  if (selectedId !== null && detail) {
    const rx = detail as any;
    const items: any[] = Array.isArray(rx.items) ? rx.items : [];

    return (
      <DashboardLayout role="assistant">
        <div className="space-y-4 print:space-y-3">
          {/* Toolbar - hidden on print */}
          <div className="flex items-center gap-3 print:hidden">
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            {rx.referenceNo && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/verify/${rx.referenceNo}`} target="_blank" rel="noreferrer">
                  <FileText className="h-4 w-4 mr-1.5" /> Verify
                </a>
              </Button>
            )}
          </div>

          {/* Prescription Detail — read-only */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {rx.referenceNo ?? `Prescription #${rx.id}`}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(rx.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                <Badge variant={rx.status === "final" ? "default" : "secondary"}>{rx.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Patient */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Patient</h3>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{rx.patientName}</span>
                    {rx.patientAge && <span className="text-muted-foreground">· {rx.patientAge}y</span>}
                    {rx.patientGender && <span className="text-muted-foreground">· {rx.patientGender}</span>}
                  </div>
                  {rx.patientPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{rx.patientPhone}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Chief Complaint */}
              {rx.chiefComplaint && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Chief Complaint</h3>
                  <p className="text-sm whitespace-pre-wrap">{rx.chiefComplaint}</p>
                </section>
              )}

              {/* Vitals */}
              {rx.vitals && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Vitals</h3>
                  <p className="text-sm whitespace-pre-wrap">{typeof rx.vitals === "string" ? rx.vitals : JSON.stringify(rx.vitals)}</p>
                </section>
              )}

              {/* Examination */}
              {rx.examination && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    <span className="flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" /> Examination</span>
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{rx.examination}</p>
                </section>
              )}

              {/* Diagnosis */}
              {rx.diagnosis && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Diagnosis</h3>
                  <p className="text-sm whitespace-pre-wrap">{rx.diagnosis}</p>
                </section>
              )}

              {/* Medications */}
              {items.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                    <Pill className="h-3.5 w-3.5" /> Medications
                  </h3>
                  <div className="space-y-2">
                    {items.map((item: any, i: number) => (
                      <div key={item.id ?? i} className="rounded-lg border px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-medium">{item.medicineName}</span>
                          {item.strength && <Badge variant="outline" className="text-xs">{item.strength}</Badge>}
                        </div>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {[item.dose, item.duration, item.mealTiming, item.instruction].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Investigations */}
              {rx.investigations && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                    <FlaskConical className="h-3.5 w-3.5" /> Investigations
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{rx.investigations}</p>
                </section>
              )}

              {/* Advice */}
              {rx.advice && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Advice</h3>
                  <p className="text-sm whitespace-pre-wrap">{rx.advice}</p>
                </section>
              )}

              {/* Follow-up */}
              {rx.followUpDate && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Follow-up
                  </h3>
                  <p className="text-sm">{rx.followUpDate}</p>
                </section>
              )}
            </CardContent>
          </Card>

          {/* View-only notice */}
          <p className="text-xs text-muted-foreground text-center print:hidden">
            View-only access · Assistants cannot edit or sign prescriptions
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="assistant">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Prescriptions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">View and print prescriptions (read-only)</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by patient name, phone, or reference…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-6 text-center">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">
                {search ? "No prescriptions found" : "No prescriptions yet"}
              </p>
            ) : (
              <div className="divide-y">
                {filtered.map((rx: any) => (
                  <button
                    key={rx.id}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setSelectedId(rx.id)}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{rx.referenceNo ?? `Rx #${rx.id}`}</p>
                        <Badge variant={rx.status === "final" ? "default" : "secondary"} className="text-xs">{rx.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {rx.patientName} · {rx.patientPhone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(rx.createdAt).toLocaleDateString()}
                        {rx.followUpDate ? ` · Follow-up: ${rx.followUpDate}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!search && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" disabled={list.length < 30} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
