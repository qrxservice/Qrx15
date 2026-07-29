import { useState } from "react";
import { useListAppointments, useUpdateAppointment } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
};

export default function DoctorAppointmentsPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useListAppointments({
    date: date || undefined,
    status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
    page, limit: 20
  });

  const updateAppt = useUpdateAppointment();

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await updateAppt.mutateAsync({ id, data: { status } });
      toast({ title: "Status updated" });
      refetch();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const filtered = (data?.appointments || []).filter(a =>
    !search || a.patientName?.toLowerCase().includes(search.toLowerCase()) || a.patientPhone?.includes(search)
  );

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground mt-1">Manage your patient appointments</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(1); }} className="w-40" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Appointments ({data?.total ?? 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No appointments found</div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="md:hidden divide-y">
                  {filtered.map(appt => (
                    <div key={appt.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary text-sm">#{appt.serialNo}</span>
                            <span className="font-medium text-sm truncate">{appt.patientName}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{appt.patientPhone}</p>
                          {(appt.patientAge || appt.patientGender) && (
                            <p className="text-xs text-muted-foreground">
                              {appt.patientAge ? `${appt.patientAge}yr` : ""} {appt.patientGender}
                            </p>
                          )}
                          {appt.complaint && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{appt.complaint}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{appt.appointmentDate}</p>
                        </div>
                        <Badge variant={STATUS_COLORS[appt.status || "pending"]} className="shrink-0">{appt.status}</Badge>
                      </div>
                      <div className="flex items-center gap-1 pt-1 border-t">
                        {appt.status === "pending" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleStatusUpdate(appt.id, "confirmed")} title="Confirm">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {(appt.status === "pending" || appt.status === "confirmed") && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => handleStatusUpdate(appt.id, "completed")} title="Mark completed">
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => handleStatusUpdate(appt.id, "cancelled")} title="Cancel">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Age/Gender</TableHead>
                        <TableHead>Complaint</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(appt => (
                        <TableRow key={appt.id}>
                          <TableCell className="font-bold text-primary">#{appt.serialNo}</TableCell>
                          <TableCell className="font-medium">{appt.patientName}</TableCell>
                          <TableCell className="text-muted-foreground">{appt.patientPhone}</TableCell>
                          <TableCell className="text-muted-foreground">{appt.patientAge ? `${appt.patientAge}yr` : ""} {appt.patientGender}</TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">{appt.complaint || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{appt.appointmentDate}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_COLORS[appt.status || "pending"]}>{appt.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {appt.status === "pending" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleStatusUpdate(appt.id, "confirmed")} title="Confirm">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {(appt.status === "pending" || appt.status === "confirmed") && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700" onClick={() => handleStatusUpdate(appt.id, "completed")} title="Mark completed">
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => handleStatusUpdate(appt.id, "cancelled")} title="Cancel">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {data && data.total > 20 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-4 py-2 text-sm">Page {page}</span>
            <Button variant="outline" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
