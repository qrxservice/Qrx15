import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListAdminPrescriptions, listAdminPrescriptions, useListCountries, useListLocations, type Prescription } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu as DM, DropdownMenuContent as DMC, DropdownMenuItem as DMI, DropdownMenuTrigger as DMT } from "@/components/ui/dropdown-menu";
import { ClipboardList, Search, Download, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { exportToCsv, exportToExcel, exportToPdf } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;

export default function AdminPrescriptionsPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({ patientName: "", patientPhone: "", referenceNo: "", dateFrom: "", dateTo: "", countryId: "all", locationId: "all" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [viewRx, setViewRx] = useState<Prescription | null>(null);

  const { data: countries } = useListCountries();
  const { data: locations } = useListLocations();

  const filterParams = {
    ...(applied.patientName ? { patientName: applied.patientName } : {}),
    ...(applied.patientPhone ? { patientPhone: applied.patientPhone } : {}),
    ...(applied.referenceNo ? { referenceNo: applied.referenceNo } : {}),
    ...(applied.dateFrom ? { dateFrom: applied.dateFrom } : {}),
    ...(applied.dateTo ? { dateTo: applied.dateTo } : {}),
    ...(applied.countryId !== "all" ? { countryId: Number(applied.countryId) } : {}),
    ...(applied.locationId !== "all" ? { locationId: Number(applied.locationId) } : {}),
  };
  const params = { page, limit: PAGE_SIZE, ...filterParams };
  const { data } = useListAdminPrescriptions(params);
  const prescriptions = data?.prescriptions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [bulkLoading, setBulkLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied(filters);
    setPage(1);
  };

  const medicinesText = (p: Prescription) =>
    (p.items ?? [])
      .map(it => {
        const head = [it.dosageForm, it.medicineName, it.strength].filter(Boolean).join(" ");
        const tail = [it.dose, it.mealTiming, it.duration].filter(Boolean).join(" — ");
        return tail ? `${head} (${tail})` : head;
      })
      .filter(Boolean)
      .join(" | ");

  const toRows = (list: Prescription[]) => list.map(p => ({
    Reference: p.referenceNo ?? "",
    Patient: p.patientName,
    Phone: p.patientPhone ?? "",
    Age: p.patientAge ?? "",
    Gender: p.patientGender ?? "",
    Doctor: p.doctorName ?? "",
    Diagnosis: p.diagnosis ?? "",
    Medicines: medicinesText(p),
    Date: new Date(p.createdAt).toLocaleDateString(),
  }));

  const doExport = (fmt: "csv" | "excel" | "pdf") => {
    const rows = toRows(prescriptions);
    if (!rows.length) { toast({ title: "Nothing to export", variant: "destructive" }); return; }
    if (fmt === "csv") exportToCsv("prescriptions", rows);
    else if (fmt === "excel") exportToExcel("prescriptions", rows);
    else exportToPdf("Prescriptions", Object.keys(rows[0]), rows.map(r => Object.values(r) as (string | number)[]));
  };

  // Export ALL matching prescriptions by paginating through every page (backend caps each page at 200).
  const doBulkPdf = async () => {
    setBulkLoading(true);
    try {
      const BULK_PAGE = 200;
      const all: Prescription[] = [];
      let pageNum = 1;
      let totalCount = Infinity;
      while (all.length < totalCount) {
        const res = await listAdminPrescriptions({ page: pageNum, limit: BULK_PAGE, ...filterParams });
        const batch = res.prescriptions ?? [];
        all.push(...batch);
        totalCount = res.total ?? all.length;
        if (!batch.length) break;
        pageNum += 1;
      }
      const rows = toRows(all);
      if (!rows.length) { toast({ title: "Nothing to export", variant: "destructive" }); return; }
      exportToPdf("Prescriptions (all results)", Object.keys(rows[0]), rows.map(r => Object.values(r) as (string | number)[]));
      toast({ title: `Exported ${rows.length} prescription(s)` });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" />Prescription Repository</h1>
            <p className="text-muted-foreground text-sm mt-1">Search and export prescriptions across all doctors</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={doBulkPdf} disabled={bulkLoading}>
              <Download className="h-4 w-4 mr-1.5" />{bulkLoading ? "Exporting…" : "Bulk PDF (all)"}
            </Button>
            <DM>
              <DMT asChild><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Export page</Button></DMT>
              <DMC align="end">
                <DMI onClick={() => doExport("csv")}>CSV</DMI>
                <DMI onClick={() => doExport("excel")}>Excel (.xlsx)</DMI>
                <DMI onClick={() => doExport("pdf")}>PDF</DMI>
              </DMC>
            </DM>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5"><Label className="text-xs">Patient name</Label><Input value={filters.patientName} onChange={e => setFilters(f => ({ ...f, patientName: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={filters.patientPhone} onChange={e => setFilters(f => ({ ...f, patientPhone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Reference No</Label><Input value={filters.referenceNo} onChange={e => setFilters(f => ({ ...f, referenceNo: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <Select value={filters.countryId} onValueChange={v => setFilters(f => ({ ...f, countryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="All countries" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {countries?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Division / District</Label>
                <Select value={filters.locationId} onValueChange={v => setFilters(f => ({ ...f, locationId: v }))}>
                  <SelectTrigger><SelectValue placeholder="All divisions" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All divisions</SelectItem>
                    {locations?.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">From</Label><Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">To</Label><Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} /></div>
              <div className="flex items-end">
                <Button type="submit" size="sm" className="w-full"><Search className="h-4 w-4 mr-1.5" />Search</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {!prescriptions.length ? (
              <div className="py-16 text-center text-muted-foreground">No prescriptions found.</div>
            ) : (
              <div className="divide-y">
                {prescriptions.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{p.patientName}</p>
                        {p.referenceNo && <Badge variant="outline" className="text-xs shrink-0">{p.referenceNo}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.patientPhone ?? "—"} · Dr. {p.doctorName ?? "—"} · {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setViewRx(p)}><Eye className="h-4 w-4 mr-1" />View</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Prev</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} total</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      </div>

      <Dialog open={!!viewRx} onOpenChange={o => !o && setViewRx(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{viewRx?.referenceNo ?? "Prescription"}</DialogTitle></DialogHeader>
          {viewRx && (() => {
            const vitalsLines = viewRx.vitals
              ? String(viewRx.vitals).split(/[\n,|]+/).map(v => v.trim()).filter(Boolean)
              : [];
            return (
              <div className="space-y-3 text-sm max-h-[65vh] overflow-y-auto pr-1">
                {/* Patient info */}
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Patient:</span> {viewRx.patientName}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {viewRx.patientPhone ?? "—"}</div>
                  <div><span className="text-muted-foreground">Age:</span> {viewRx.patientAge ?? "—"}</div>
                  <div><span className="text-muted-foreground">Gender:</span> {viewRx.patientGender ?? "—"}</div>
                  <div><span className="text-muted-foreground">Doctor:</span> Dr. {viewRx.doctorName ?? "—"}</div>
                  <div><span className="text-muted-foreground">Date:</span> {new Date(viewRx.createdAt).toLocaleDateString()}</div>
                  {viewRx.patientWeight && <div><span className="text-muted-foreground">Weight:</span> {viewRx.patientWeight}</div>}
                </div>

                {/* Clinical findings */}
                {viewRx.chiefComplaint && (
                  <div>
                    <p className="text-muted-foreground font-medium">C/C</p>
                    <p className="whitespace-pre-wrap">{viewRx.chiefComplaint}</p>
                  </div>
                )}
                {(vitalsLines.length > 0 || viewRx.examination) && (
                  <div>
                    <p className="text-muted-foreground font-medium">O/E</p>
                    {vitalsLines.map((v, i) => <p key={i}>{v}</p>)}
                    {viewRx.examination && <p className="whitespace-pre-wrap mt-1">{viewRx.examination}</p>}
                  </div>
                )}
                {viewRx.diagnosis && (
                  <p><span className="text-muted-foreground font-medium">Dx:</span> {viewRx.diagnosis}</p>
                )}
                {viewRx.investigations && (
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">IX</p>
                    <div className="flex flex-wrap gap-1">
                      {viewRx.investigations.split(",").map((v, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{v.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medicines */}
                {!!viewRx.items?.length && (
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Medicines</p>
                    <ul className="space-y-1">
                      {viewRx.items.map((it, i) => (
                        <li key={i} className="border rounded p-2 bg-muted/30">
                          <span className="font-medium">
                            {it.dosageForm ? `${it.dosageForm}. ` : ""}{it.medicineName}{it.strength ? ` ${it.strength}` : ""}
                          </span>
                          {it.genericName && <span className="text-muted-foreground text-xs ml-1">({it.genericName})</span>}
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {[it.dose, it.mealTiming, it.duration, it.instruction].filter(Boolean).join(" · ")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Advice & follow-up */}
                {viewRx.advice && (
                  <div>
                    <p className="text-muted-foreground font-medium">Advice</p>
                    <p className="whitespace-pre-wrap">{viewRx.advice}</p>
                  </div>
                )}
                {viewRx.followUpDate && (
                  <p><span className="text-muted-foreground font-medium">Follow-up:</span> {viewRx.followUpDate}</p>
                )}
                {viewRx.notes && (
                  <div>
                    <p className="text-muted-foreground font-medium">Notes</p>
                    <p className="whitespace-pre-wrap">{viewRx.notes}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
