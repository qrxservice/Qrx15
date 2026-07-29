import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListAppointments, useUpdateAppointment } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Phone, Mail, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  no_show: "bg-gray-100 text-gray-600",
};

export default function AdminAppointmentsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, refetch } = useListAppointments({
    date: dateFilter || undefined,
    status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
    page, limit,
  });

  const updateAppt = useUpdateAppointment();

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateAppt.mutateAsync({ id, data: { status } });
      toast({ title: "Status updated" });
      refetch();
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const appointments = data?.appointments ?? [];
  const total = data?.total ?? 0;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">All Appointments</h1>
          <p className="text-muted-foreground text-sm mt-1">View and manage all patient appointments across doctors</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search patient name or phone..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Input type="date" className="w-44" value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setPage(1); }} />
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">Showing {appointments.length} of {total} appointments</p>

        {appointments.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No appointments found</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {appointments.map(appt => (
              <Card key={appt.id}>
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{appt.patientName}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[appt.status] ?? STATUS_COLORS.pending}`}>{appt.status}</Badge>
                      <span className="text-xs text-muted-foreground">Serial #{appt.serialNo}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{appt.patientPhone}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{appt.appointmentDate}</span>
                      {appt.doctorName && <span className="flex items-center gap-1"><User className="h-3 w-3" />Dr. {appt.doctorName}</span>}
                    </div>
                    {appt.complaint && <p className="text-xs text-muted-foreground mt-1 truncate">{appt.complaint}</p>}
                  </div>
                  <Select value={appt.status} onValueChange={v => handleStatusChange(appt.id, v)}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {total > limit && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / limit)}</span>
            <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
