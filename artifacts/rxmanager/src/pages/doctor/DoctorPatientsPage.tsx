import { useState } from "react";
import { useListPrescriptions, useGetPrescription } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Search, FileText, Printer, User } from "lucide-react";

function PrescriptionDetail({ id }: { id: number }) {
  const { data: rx } = useGetPrescription(id);
  if (!rx) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  const vitalsLines = rx.vitals
    ? String(rx.vitals).split(/[\n,|]+/).map(v => v.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-4 print:text-black">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Patient:</span> <strong>{rx.patientName}</strong></div>
        <div><span className="text-muted-foreground">Age/Gender:</span> <strong>{rx.patientAge ? `${rx.patientAge}yr` : ""} {rx.patientGender}</strong></div>
        <div><span className="text-muted-foreground">Phone:</span> <strong>{rx.patientPhone || "—"}</strong></div>
        <div><span className="text-muted-foreground">Date:</span> <strong>{rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : "—"}</strong></div>
        {rx.patientWeight && <div><span className="text-muted-foreground">Weight:</span> <strong>{rx.patientWeight}</strong></div>}
      </div>
      <Separator />

      {/* Clinical findings */}
      {rx.chiefComplaint && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Chief Complaint (C/C)</p>
          <p className="text-sm whitespace-pre-wrap">{rx.chiefComplaint}</p>
        </div>
      )}
      {(vitalsLines.length > 0 || rx.examination) && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">On Examination (O/E)</p>
          {vitalsLines.map((v, i) => <p key={i} className="text-sm">{v}</p>)}
          {rx.examination && <p className="text-sm whitespace-pre-wrap mt-1">{rx.examination}</p>}
        </div>
      )}
      {rx.diagnosis && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Diagnosis (Dx)</p>
          <p className="font-semibold text-sm">{rx.diagnosis}</p>
        </div>
      )}
      {rx.investigations && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Investigations (IX)</p>
          <div className="flex flex-wrap gap-1.5">
            {rx.investigations.split(",").map((v, i) => (
              <Badge key={i} variant="outline" className="text-xs">{v.trim()}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Medicines */}
      {rx.items && rx.items.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2 flex items-center gap-1"><FileText className="h-4 w-4" />Medicines</p>
          <div className="space-y-2">
            {rx.items.map((item, i) => (
              <div key={i} className="p-3 border rounded bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      {item.dosageForm ? `${item.dosageForm}. ` : ""}{item.medicineName}{item.strength ? ` ${item.strength}` : ""}
                    </p>
                    {item.genericName && <p className="text-xs text-muted-foreground">{item.genericName}</p>}
                  </div>
                  {item.mealTiming && <Badge variant="outline" className="text-xs shrink-0">{item.mealTiming}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {[item.dose, item.duration, item.instruction].filter(Boolean).join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advice & follow-up */}
      {rx.advice && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Advice</p>
          <p className="text-sm whitespace-pre-wrap">{rx.advice}</p>
        </div>
      )}
      {rx.followUpDate && (
        <p className="text-sm font-medium">Follow-up: {rx.followUpDate}</p>
      )}
      {rx.notes && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Clinical Notes</p>
          <p className="text-sm">{rx.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function DoctorPatientsPage() {
  const [patientPhone, setPatientPhone] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const { data: prescriptions, isLoading } = useListPrescriptions({
    patientPhone: patientPhone || undefined,
    page,
    limit: 20,
  });

  const list = prescriptions || [];

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Patient Prescriptions</h1>
          <p className="text-muted-foreground mt-1">View and manage past prescriptions</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by patient phone..."
            value={patientPhone}
            onChange={e => { setPatientPhone(e.target.value); setPage(1); }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-3 text-center py-12 text-muted-foreground">Loading...</div>
          ) : list.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No prescriptions found</p>
            </div>
          ) : list.map(rx => (
            <Card key={rx.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedId(rx.id)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{rx.patientName}</p>
                    <p className="text-xs text-muted-foreground">{rx.patientPhone || "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{rx.diagnosis}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : "—"}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {rx.items?.length || 0} medicines
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {list.length === 20 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-4 py-2 text-sm">Page {page}</span>
            <Button variant="outline" onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      <Dialog open={selectedId !== null} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Prescription Details</span>
              <Button variant="ghost" size="icon" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedId && <PrescriptionDetail id={selectedId} />}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
