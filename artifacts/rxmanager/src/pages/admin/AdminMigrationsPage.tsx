import { useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListMigrations, useImportMigration, useRollbackMigration, getListMigrationsQueryKey,
  type ImportResult,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Upload, RotateCcw, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { parseSpreadsheet } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

const ENTITY_TYPES = [
  { value: "medicines", label: "Medicines", hint: "Columns: brandName (or 'name' / 'brand'), genericName, strength, dosageForm, manufacturer. Column headers with spaces are also accepted, e.g. 'Brand Name', 'Generic Name', 'Dosage Form'." },
  { value: "appointments", label: "Appointments", hint: "Columns: patientName, patientPhone, doctorId, appointmentDate, status" },
  { value: "patients", label: "Patients", hint: "Columns: patientName, patientPhone, doctorId, patientAge, patientGender (dedup by phone+doctor)" },
];

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "completed") return "default";
  if (status === "rolled_back") return "destructive";
  return "secondary";
}

export default function AdminMigrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListMigrationsQueryKey() });

  const { data: batches } = useListMigrations();
  const importMut = useImportMigration({ mutation: { onSuccess: invalidate } });
  const rollbackMut = useRollbackMigration({ mutation: { onSuccess: invalidate } });

  const [entityType, setEntityType] = useState("medicines");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsing, setParsing] = useState(false);

  const selectedHint = ENTITY_TYPES.find(e => e.value === entityType)?.hint;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setResult(null);
    try {
      const parsed = await parseSpreadsheet(file);
      setRows(parsed);
      setFileName(file.name);
      if (!parsed.length) toast({ title: "File has no data rows", variant: "destructive" });
    } catch {
      toast({ title: "Failed to parse file", variant: "destructive" });
      setRows([]);
      setFileName("");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!rows.length) { toast({ title: "Select a file first", variant: "destructive" }); return; }
    const format = fileName.toLowerCase().endsWith(".csv") ? "csv" : "excel";
    try {
      const res = await importMut.mutateAsync({ data: { entityType, fileName, format, rows } });
      setResult(res);
      setRows([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      toast({ title: `Imported ${res.importedRows} of ${res.totalRows} rows` });
    } catch { toast({ title: "Import failed", variant: "destructive" }); }
  };

  const handleRollback = async (id: number) => {
    if (!confirm("Roll back this batch? All records imported in it will be removed.")) return;
    try { await rollbackMut.mutateAsync({ id }); toast({ title: "Batch rolled back" }); }
    catch { toast({ title: "Rollback failed", variant: "destructive" }); }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-6 w-6 text-primary" />Data Migration</h1>
          <p className="text-muted-foreground text-sm mt-1">Import medicines and appointments from CSV or Excel files</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4 text-primary" />Import File</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data type</label>
                <Select value={entityType} onValueChange={v => { setEntityType(v); setResult(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">CSV / Excel file</label>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground hover:file:bg-primary/90" />
              </div>
            </div>
            {selectedHint && <p className="text-xs text-muted-foreground">{selectedHint}</p>}
            {fileName && <p className="text-sm flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4 text-primary" />{fileName} — {rows.length} rows ready</p>}
            <Button onClick={handleImport} disabled={parsing || importMut.isPending || !rows.length}>
              <Upload className="h-4 w-4 mr-1.5" />{importMut.isPending ? "Importing…" : "Import"}
            </Button>

            {result && (
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Imported {result.importedRows}</Badge>
                  <Badge variant="secondary">Skipped {result.skippedRows}</Badge>
                  <Badge variant="outline">Total {result.totalRows}</Badge>
                </div>
                {!!result.duplicates?.length && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Duplicates skipped:</p>
                    <p className="truncate">{result.duplicates.slice(0, 20).join(", ")}{result.duplicates.length > 20 ? "…" : ""}</p>
                  </div>
                )}
                {!!result.errors?.length && (
                  <div className="text-xs text-destructive">
                    <p className="font-medium">Errors:</p>
                    <p>{result.errors.slice(0, 10).join("; ")}</p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-muted-foreground flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>Only CSV and Excel imports are supported. PDF, image, and SQL dump extraction require OCR/AI and are not available. Convert your data to CSV/Excel with a header row first.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Import History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!batches?.length ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No imports yet.</div>
            ) : (
              <div className="divide-y">
                {batches.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{b.entityType}</p>
                        <Badge variant={statusVariant(b.status)} className="text-xs">{b.status}</Badge>
                        {b.format && <Badge variant="outline" className="text-xs">{b.format}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {b.fileName ?? "—"} · {b.importedRows}/{b.totalRows} imported · {b.skippedRows} skipped · {new Date(b.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {b.status === "completed" && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                        disabled={rollbackMut.isPending} onClick={() => handleRollback(b.id)}>
                        <RotateCcw className="h-4 w-4 mr-1" />Rollback
                      </Button>
                    )}
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
