import { useState, useCallback, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTrackAppointment } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Clock, MapPin, Activity, Users, RefreshCw, Zap } from "lucide-react";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";

function BreakBanner({ breakUntil }: { breakUntil: string }) {
  const [countdown, setCountdown] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const tick = () => {
      const ms = new Date(breakUntil).getTime() - Date.now();
      if (ms <= 0) { setCountdown("Resuming soon…"); if (timerRef.current) clearInterval(timerRef.current); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setCountdown(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [breakUntil]);
  const resumeTime = new Date(breakUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-xs text-yellow-800 font-medium space-y-0.5">
      <div>🟡 Doctor is temporarily on break. Please wait.</div>
      <div className="flex gap-3 text-yellow-700">
        <span>Remaining: <strong className="font-mono">{countdown}</strong></span>
        <span>Expected resume: <strong>{resumeTime}</strong></span>
      </div>
    </div>
  );
}

type TrackItem = {
  id: number;
  serialNo: number;
  status: string;
  doctorName: string;
  appointmentDate: string;
  currentServingSerial?: number | null;
  patientsAhead?: number;
  waitingCount?: number | null;
  doctorStatus?: string | null;
  breakUntil?: string | null;
};

export default function TrackQueuePage() {
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [appliedPhone, setAppliedPhone] = useState("");
  const [detail, setDetail] = useState<TrackItem | null>(null);
  const [wsFlash, setWsFlash] = useState(false);

  const { data, isLoading, isFetching, refetch } = useTrackAppointment(
    { phone: appliedPhone },
    {
      query: {
        queryKey: ["track", appliedPhone],
        enabled: !!appliedPhone,
        refetchInterval: appliedPhone ? 10000 : false,
      },
    },
  );

  const handleWsUpdate = useCallback(() => {
    void refetch();
    setWsFlash(true);
    setTimeout(() => setWsFlash(false), 800);
  }, [refetch]);

  useQueueWebSocket(appliedPhone ? 0 : null, handleWsUpdate);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setAppliedPhone(phone.trim());
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    confirmed: "bg-blue-100 text-blue-800 border-blue-200",
    serving: "bg-purple-100 text-purple-800 border-purple-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };
  const fmtStatus = (s: string) => (s || "pending").charAt(0).toUpperCase() + (s || "pending").slice(1);

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
        <div className="text-center mb-8 sm:mb-10">
          <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Track Your Queue</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Enter your phone number to check your appointment status</p>
        </div>

        <Card className="mb-6 max-w-lg mx-auto">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    className="pl-9"
                    placeholder="01711XXXXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Searching..." : "Track Appointment"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {appliedPhone && (
          <>
            {isLoading ? (
              <Card className="max-w-lg mx-auto"><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card>
            ) : !data || data.appointments.length === 0 ? (
              <Card className="max-w-lg mx-auto">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p className="text-lg font-medium">No appointments found</p>
                  <p className="text-sm mt-1">No upcoming appointments found for this phone number.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{data.appointments.length} appointment(s) found</span>
                  <span className="flex items-center gap-1.5">
                    {wsFlash ? (
                      <Zap className="h-3.5 w-3.5 text-primary animate-pulse" />
                    ) : (
                      <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                    )}
                    <button type="button" onClick={() => refetch()} className="hover:text-foreground">
                      {wsFlash ? "Updated!" : "Live · refresh"}
                    </button>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data.appointments as TrackItem[]).map((appt, idx) => (
                  <Card key={idx} className="overflow-hidden">
                    <div className="h-1 bg-primary" />
                    {/* Doctor status banner */}
                    {appt.doctorStatus === "offline" && (
                      <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700 font-medium">
                        🔴 Doctor has ended appointments for today.
                      </div>
                    )}
                    {appt.doctorStatus === "busy" && appt.breakUntil && (
                      <BreakBanner breakUntil={appt.breakUntil} />
                    )}
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{appt.doctorName}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">#{appt.serialNo}</div>
                          <div className="text-xs text-muted-foreground">Serial No.</div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {appt.appointmentDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{appt.appointmentDate}</span>
                          </div>
                        )}
                        {appt.patientsAhead != null && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>Patients ahead: {appt.patientsAhead}</span>
                          </div>
                        )}
                        {appt.waitingCount != null && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <span>Total waiting: {appt.waitingCount}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${statusColor[appt.status || "pending"] ?? statusColor.pending}`}>
                          {fmtStatus(appt.status)}
                        </span>
                        {appt.currentServingSerial != null && (
                          <span className="text-sm text-muted-foreground">
                            Now serving: <strong>#{appt.currentServingSerial}</strong>
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setDetail(appt)}>View Details</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Queue Details</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span className="font-medium">{detail.doctorName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Your serial</span><span className="font-medium">#{detail.serialNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Now serving</span><span className="font-medium">{detail.currentServingSerial != null ? `#${detail.currentServingSerial}` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Patients ahead</span><span className="font-medium">{detail.patientsAhead ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total waiting</span><span className="font-medium">{detail.waitingCount ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{detail.appointmentDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${statusColor[detail.status || "pending"] ?? statusColor.pending}`}>{fmtStatus(detail.status)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
