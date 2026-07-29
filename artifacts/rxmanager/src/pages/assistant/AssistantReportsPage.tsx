import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlaskConical, Search, Download, FileText, Phone, User, Calendar } from "lucide-react";
import { downloadObject } from "@/lib/storage";

const today = () => new Date().toISOString().split("T")[0];

export default function AssistantReportsPage() {
  const { user } = useAuth();
  const doctorId = user?.doctorId ?? 0;
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState("");

  const { data: apptData, isLoading } = useListAppointments(
    { doctorId, date, limit: 200 },
    { query: { queryKey: ["asst-reports", doctorId, date], enabled: !!doctorId } },
  );

  const appts: any[] = apptData?.appointments ?? [];

  // Show appointments that have a lab report or are marked pending investigation
  const reportAppts = appts.filter(a =>
    a.labReportUrl || a.status === "pending_investigation" || a.prescriptionUploadUrl,
  );

  const filtered = reportAppts.filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.patientName?.toLowerCase().includes(q) ||
      a.patientPhone?.includes(q)
    );
  });

  return (
    <DashboardLayout role="assistant">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" /> Investigation Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lab reports and investigation results uploaded by patients
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Search patient name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Input
            type="date"
            className="h-9 text-sm w-44"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{reportAppts.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Reports</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-amber-600">
                {appts.filter(a => a.status === "pending_investigation").length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Pending Investigation</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-teal-600">
                {appts.filter(a => a.labReportUrl).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Reports Received</p>
            </CardContent>
          </Card>
        </div>

        {/* Report List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" /> Reports for {date}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No investigation reports found for this date
              </p>
            ) : (
              <div className="divide-y">
                {filtered.map((appt: any) => (
                  <div key={appt.id} className="flex items-start gap-4 px-4 py-3 hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                        <span className="font-medium text-sm flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {appt.patientName ?? "—"}
                        </span>
                        {appt.patientPhone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {appt.patientPhone}
                          </span>
                        )}
                        {appt.appointmentTime && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {appt.appointmentTime}
                          </span>
                        )}
                      </div>
                      {appt.complaint && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{appt.complaint}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge
                          variant="outline"
                          className={
                            appt.status === "pending_investigation"
                              ? "text-amber-600 border-amber-300 bg-amber-50"
                              : appt.status === "completed"
                              ? "text-green-600 border-green-300 bg-green-50"
                              : "text-slate-600 border-slate-300"
                          }
                        >
                          {appt.status ?? "—"}
                        </Badge>
                        {appt.labReportUrl && (
                          <Badge variant="outline" className="text-teal-600 border-teal-300 bg-teal-50">
                            <FileText className="h-3 w-3 mr-1" /> Lab Report
                          </Badge>
                        )}
                        {appt.prescriptionUploadUrl && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                            <FileText className="h-3 w-3 mr-1" /> Prescription
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {appt.labReportUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => downloadObject(appt.labReportUrl)}
                        >
                          <Download className="h-3 w-3" /> Lab Report
                        </Button>
                      )}
                      {appt.prescriptionUploadUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => downloadObject(appt.prescriptionUploadUrl)}
                        >
                          <Download className="h-3 w-3" /> Prescription
                        </Button>
                      )}
                    </div>
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
