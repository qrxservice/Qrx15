import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetPatientTimeline } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, Search, Calendar, ClipboardList, Stethoscope } from "lucide-react";

export default function AdminPatientTimelinePage() {
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");

  const { data: timeline, isFetching } = useGetPatientTimeline(
    { phone },
    { query: { enabled: !!phone, queryKey: ["patient-timeline", phone] } },
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPhone(phoneInput.trim());
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />Patient Timeline</h1>
          <p className="text-muted-foreground text-sm mt-1">Aggregated appointments and prescriptions for a patient</p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-md">
          <Input placeholder="Patient phone number" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} />
          <Button type="submit"><Search className="h-4 w-4 mr-1.5" />Search</Button>
        </form>

        {phone && (
          <>
            {isFetching ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !timeline?.events.length ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">No records found for {phone}.</CardContent></Card>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">{timeline.patientName ?? "Patient"}</h2>
                  <Badge variant="outline">{phone}</Badge>
                  <Badge variant="secondary">{timeline.events.length} events</Badge>
                </div>
                <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {timeline.events.map(ev => (
                    <Card key={`${ev.type}-${ev.id}`} className="relative">
                      <span className="absolute -left-[18px] top-5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                        {ev.type === "prescription"
                          ? <ClipboardList className="h-2.5 w-2.5 text-primary-foreground" />
                          : <Calendar className="h-2.5 w-2.5 text-primary-foreground" />}
                      </span>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{ev.title}</p>
                          <span className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString()}</span>
                        </div>
                        {ev.doctorName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                            <Stethoscope className="h-3 w-3" />Dr. {ev.doctorName}
                          </p>
                        )}
                        {ev.summary && <p className="text-sm">{ev.summary}</p>}
                        {ev.diagnosis && <p className="text-sm"><span className="text-muted-foreground">Diagnosis:</span> {ev.diagnosis}</p>}
                        {(ev.bp || ev.pulse || ev.temp || ev.weight || ev.height) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {ev.bp && <Badge variant="outline" className="text-xs">BP {ev.bp}</Badge>}
                            {ev.pulse && <Badge variant="outline" className="text-xs">Pulse {ev.pulse}</Badge>}
                            {ev.temp && <Badge variant="outline" className="text-xs">Temp {ev.temp}</Badge>}
                            {ev.weight && <Badge variant="outline" className="text-xs">Wt {ev.weight}</Badge>}
                            {ev.height && <Badge variant="outline" className="text-xs">Ht {ev.height}</Badge>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
