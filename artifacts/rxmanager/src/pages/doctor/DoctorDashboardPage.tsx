import { useState, useEffect, useRef } from "react";
import { useListAppointments, useListQueue, useGetDoctorProfile, useUpdateDoctorStatus, useGetAppSettings, useGetDoctorSubscription, useGetPaymentGatewaysStatus, useGetMyQueueDevices } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Activity, Clock, ChevronRight, Coffee, Timer, Play, Square, ClipboardPlus, Megaphone, CreditCard, AlertTriangle, Moon, CheckCircle2, FlaskConical, CalendarClock, Monitor, Tv, Smartphone, Tablet, MonitorSmartphone, ExternalLink, Volume2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_OPTIONS = [
  { value: "online",   label: "Available", color: "bg-green-500", text: "text-green-700", bg: "bg-green-50 border-green-200 hover:bg-green-100" },
  { value: "busy",     label: "On Break",  color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200 hover:bg-amber-100" },
  { value: "vacation", label: "Vacation",  color: "bg-blue-500",  text: "text-blue-700",  bg: "bg-blue-50 border-blue-200 hover:bg-blue-100" },
  { value: "offline",  label: "Day Ended", color: "bg-red-500",   text: "text-red-700",   bg: "bg-red-50 border-red-200 hover:bg-red-100" },
] as const;

export default function DoctorDashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const { data: doctor } = useGetDoctorProfile();
  const { data: appSettings } = useGetAppSettings();
  const { data: subscription } = useGetDoctorSubscription();
  const { data: apptData } = useListAppointments({ date: today, limit: 5 });
  const { data: queueData } = useListQueue({ doctorId: doctor?.id ?? 0, date: today });
  const updateStatus = useUpdateDoctorStatus();
  const { data: gatewayStatus } = useGetPaymentGatewaysStatus();
  const { data: displayDevices } = useGetMyQueueDevices();
  const [paying, setPaying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [rxStats, setRxStats] = useState<{ pendingInvestigation: number; followUpDue: number } | null>(null);
  const [breakEndTime, setBreakEndTime] = useState<Date | null>(null);
  const [breakCountdownStr, setBreakCountdownStr] = useState("");
  const breakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleStatusChange = async (status: string) => {
    setUpdatingStatus(status);
    try {
      await updateStatus.mutateAsync({ data: { status: status as "online" | "offline" | "busy" | "vacation" } });
      await queryClient.invalidateQueries({ queryKey: ["doctor", "profile"] });
      toast({ title: `Status set to ${status}` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const fmtCountdown = (end: Date) => {
    const ms = end.getTime() - Date.now();
    if (ms <= 0) return "00:00:00";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };

  const handleBreak = async (minutes: number) => {
    const end = new Date(Date.now() + minutes * 60 * 1000);
    setBreakEndTime(end);
    setBreakCountdownStr(fmtCountdown(end));
    setUpdatingStatus("busy");
    try {
      await updateStatus.mutateAsync({ data: { status: "busy", breakUntil: end.toISOString() } });
      await queryClient.invalidateQueries({ queryKey: ["doctor", "profile"] });
      toast({ title: `Break started`, description: `Status set to Busy for ${minutes} min` });
    } catch {
      toast({ title: "Failed to start break", variant: "destructive" });
    } finally {
      setUpdatingStatus(null);
    }
    if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    breakTimerRef.current = setInterval(() => {
      const remaining = end.getTime() - Date.now();
      if (remaining <= 0) {
        setBreakEndTime(null);
        setBreakCountdownStr("");
        if (breakTimerRef.current) clearInterval(breakTimerRef.current);
      } else {
        setBreakCountdownStr(fmtCountdown(end));
      }
    }, 1000);
  };

  const endBreak = () => {
    setBreakEndTime(null);
    setBreakCountdownStr("");
    if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    handleStatusChange("online");
  };

  useEffect(() => () => { if (breakTimerRef.current) clearInterval(breakTimerRef.current); }, []);

  // Fetch prescription stats (pending investigation + follow-up due)
  useEffect(() => {
    const token = localStorage.getItem("auth_token") || "";
    fetch("/api/prescriptions/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRxStats(data); })
      .catch(() => {});
  }, []);

  const todayAppointments = apptData?.appointments || [];
  const waiting = queueData?.waiting || [];
  const serving = queueData?.serving?.[0];
  const allQueueEntries = [
    ...(queueData?.serving || []),
    ...(queueData?.waiting || []),
    ...(queueData?.seen || []),
    ...(queueData?.skipped || []),
  ];
  const qCompleted = (queueData as any)?.completed ?? 0;
  const qSkipped = (queueData as any)?.skipped?.length ?? 0;
  const qTotalToday = (queueData as any)?.totalToday ?? 0;
  const qAvgConsultMs = (queueData as any)?.avgConsultationMs ?? 0;
  const qFirstPatientTime = (queueData as any)?.firstPatientTime ?? null;
  const qLastPatientTime = (queueData as any)?.lastPatientTime ?? null;
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const stats = [
    { title: "Today's Appointments", value: apptData?.total ?? 0, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Waiting in Queue", value: waiting.length, icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Currently Serving", value: serving ? `#${serving.serialNo}` : "—", icon: Activity, color: "text-green-600", bg: "bg-green-50" },
    { title: "Consultation Fee", value: doctor?.consultationFee ? `৳${doctor.consultationFee}` : "—", icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        {appSettings?.noticeEnabled && appSettings.noticeText && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:p-4">
            <Megaphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-0.5">Notice</p>
              <p className="text-sm text-foreground whitespace-pre-line break-words">{appSettings.noticeText}</p>
            </div>
          </div>
        )}
        {/* ── End-of-Day Banner ── */}
        {doctor?.onlineStatus === "offline" && (
          <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 dark:from-red-950/30 dark:via-orange-950/20 dark:to-amber-950/20 dark:border-red-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-11 w-11 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                <Moon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-red-800 dark:text-red-300 text-base leading-tight">
                  Your day has ended, {doctor?.name?.split(" ")[0] || "Doctor"}!
                </p>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-0.5">
                  {qTotalToday > 0
                    ? `You served ${qTotalToday} patient${qTotalToday !== 1 ? "s" : ""} today${qCompleted > 0 ? ` — ${qCompleted} completed` : ""}. Great work!`
                    : "Thank you for your dedication. See you tomorrow!"}
                </p>
                {qTotalToday > 0 && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {qCompleted > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="h-3 w-3" /> {qCompleted} Completed
                      </span>
                    )}
                    {qSkipped > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5">
                        {qSkipped} Missed
                      </span>
                    )}
                    {qAvgConsultMs > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5">
                        <Clock className="h-3 w-3" /> Avg {Math.round(qAvgConsultMs / 60000)}m/patient
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-green-600 hover:bg-green-700 text-white gap-1.5 self-start sm:self-auto"
              disabled={updatingStatus === "online"}
              onClick={() => handleStatusChange("online")}
            >
              <Play className="h-3.5 w-3.5" /> Start New Day
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {doctor?.name || "Doctor"}</h1>
            <p className="text-muted-foreground mt-1">
              {doctor?.onlineStatus === "offline"
                ? "You are currently offline — patients cannot see you as available."
                : "Here's your practice overview for today"}
            </p>
          </div>
          {/* Online Status Toggle */}
          <Card className="w-full sm:w-auto shrink-0">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Your Status</p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(opt => {
                  const isCurrent = doctor?.onlineStatus === opt.value;
                  const isLoading = updatingStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                      disabled={isLoading || isCurrent}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all
                        ${isCurrent ? `${opt.bg} ${opt.text} border-2` : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}
                        disabled:opacity-60`}
                    >
                      <span className={`h-2 w-2 rounded-full ${isCurrent ? opt.color : "bg-gray-300"}`} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {/* Live session + Break controls */}
              <div className="flex items-center gap-2 mt-2.5 pt-2 border-t flex-wrap">
                <Button
                  variant="outline" size="sm"
                  className="h-7 text-xs gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:bg-transparent"
                  disabled={doctor?.onlineStatus === "online" || updatingStatus === "online"}
                  onClick={() => handleStatusChange("online")}
                >
                  <Play className="h-3 w-3" /> Start Live
                </Button>
                <Button
                  variant="outline" size="sm"
                  className="h-7 text-xs gap-1.5 text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-transparent"
                  disabled={doctor?.onlineStatus === "offline" || updatingStatus === "offline"}
                  onClick={() => handleStatusChange("offline")}
                >
                  <Square className="h-3 w-3" /> End Day
                </Button>
                {breakEndTime ? (
                  <>
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 gap-1 text-xs">
                      <Timer className="h-3 w-3" />
                      🟡 On Break — <span className="font-mono">{breakCountdownStr}</span>
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={endBreak}>
                      <Square className="h-3 w-3" /> End Break
                    </Button>
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50 dark:bg-transparent">
                        <Coffee className="h-3 w-3" /> Take Break
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel className="text-xs">Break Duration</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {[5, 10, 20, 30, 60].map(m => (
                        <DropdownMenuItem key={m} className="text-sm gap-2" onClick={() => handleBreak(m)}>
                          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                          {m < 60 ? `${m} minutes` : "1 hour"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 ml-auto text-primary border-primary/40 hover:bg-primary/5" asChild>
                  <Link href="/doctor/queue"><Play className="h-3 w-3" /> Start Live Queue</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <Card key={stat.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Prescription workflow counters ── */}
        {rxStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/doctor/new-prescription">
              <Card className={`cursor-pointer transition-shadow hover:shadow-md ${rxStats.pendingInvestigation > 0 ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/10" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Investigation</p>
                      <p className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-400">{rxStats.pendingInvestigation}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Awaiting lab results</p>
                    </div>
                    <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-900/30">
                      <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/doctor/new-prescription">
              <Card className={`cursor-pointer transition-shadow hover:shadow-md ${rxStats.followUpDue > 0 ? "border-blue-300 bg-blue-50/40 dark:bg-blue-950/10" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Follow-up Due</p>
                      <p className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-400">{rxStats.followUpDue}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Patients due for review</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/30">
                      <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Today's Appointments</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/doctor/appointments">View all <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">No appointments for today</p>
              ) : (
                <div className="space-y-2">
                  {todayAppointments.slice(0, 5).map(appt => (
                    <div key={appt.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{appt.patientName}</p>
                        <p className="text-xs text-muted-foreground">{appt.patientPhone} · #{appt.serialNo}</p>
                      </div>
                      <Badge variant={appt.status === "confirmed" ? "default" : "secondary"}>{appt.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Live Queue</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/doctor/queue">Manage <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {allQueueEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">Queue is empty today</p>
              ) : (
                <div className="space-y-2">
                  {allQueueEntries.slice(0, 5).map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          entry.status === "serving" ? "bg-green-100 text-green-700" :
                          entry.status === "waiting" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {entry.serialNo}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{entry.patientName}</p>
                          <p className="text-xs text-muted-foreground">{entry.patientPhone}</p>
                        </div>
                      </div>
                      <Badge variant={entry.status === "serving" ? "default" : "outline"}>{entry.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {doctor && (
          <Card>
            <CardHeader><CardTitle className="text-base">My Profile Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-muted-foreground">BMDC No.</p><p className="font-medium">{doctor.bmdcNumber || "—"}</p></div>
                <div><p className="text-muted-foreground">Department</p><p className="font-medium">{doctor.departmentName || "—"}</p></div>
                <div><p className="text-muted-foreground">Chamber</p><p className="font-medium truncate">{doctor.chamberAddress || "—"}</p></div>
                <div><p className="text-muted-foreground">Visiting Hours</p><p className="font-medium">{doctor.visitingTime || "—"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Day Summary — shown when doctor has ended the day */}
        {doctor?.onlineStatus === "offline" && qTotalToday > 0 && (
          <Card className="border-red-200 bg-red-50/30 dark:bg-red-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                🔴 Day Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                <div className="text-center p-2 rounded bg-background border">
                  <p className="text-muted-foreground text-xs">Total Patients</p>
                  <p className="text-xl font-bold">{qTotalToday}</p>
                </div>
                <div className="text-center p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200">
                  <p className="text-muted-foreground text-xs">Completed</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{qCompleted}</p>
                </div>
                <div className="text-center p-2 rounded bg-background border">
                  <p className="text-muted-foreground text-xs">Missed/Skipped</p>
                  <p className="text-xl font-bold text-amber-600">{qSkipped}</p>
                </div>
                {qAvgConsultMs > 0 && (
                  <div className="text-center p-2 rounded bg-background border">
                    <p className="text-muted-foreground text-xs">Avg Consultation</p>
                    <p className="text-xl font-bold">{Math.round(qAvgConsultMs / 60000)}m</p>
                  </div>
                )}
                {qFirstPatientTime && (
                  <div className="text-center p-2 rounded bg-background border">
                    <p className="text-muted-foreground text-xs">First Patient</p>
                    <p className="text-xl font-bold">{fmtTime(qFirstPatientTime)}</p>
                  </div>
                )}
                {qLastPatientTime && (
                  <div className="text-center p-2 rounded bg-background border">
                    <p className="text-muted-foreground text-xs">Last Patient</p>
                    <p className="text-xl font-bold">{fmtTime(qLastPatientTime)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription expiring-soon banner */}
        {subscription && subscription.status === "active" && subscription.endDate && (() => {
          const daysLeft = Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000);
          if (daysLeft <= 30 && daysLeft > 0) {
            return (
              <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                      Subscription Expiring Soon
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                      Your subscription expires in <span className="font-bold">{daysLeft} day{daysLeft !== 1 ? "s" : ""}</span> (on {subscription.endDate}). Please contact the admin to renew before it expires.
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        {/* Subscription Status Card */}
        {subscription && (
          <Card className={
            subscription.status === "active" ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" :
            subscription.status === "expired" ? "border-destructive/30 bg-destructive/5" :
            subscription.paymentStatus === "free" ? "border-primary/20" :
            "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
          }>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {subscription.status === "expired" ? (
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold text-sm mb-1">Subscription Status</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant={
                        subscription.paymentStatus === "paid" ? "default" :
                        subscription.paymentStatus === "free" ? "outline" :
                        subscription.paymentStatus === "expired" ? "destructive" : "secondary"
                      }>
                        {subscription.paymentStatus}
                      </Badge>
                      <Badge variant={
                        subscription.status === "active" ? "default" :
                        subscription.status === "expired" ? "destructive" : "secondary"
                      }>
                        {subscription.status}
                      </Badge>
                    </div>
                    {subscription.endDate && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {subscription.status === "expired" ? "Expired on" : "Valid until"}: <span className="font-medium text-foreground">{subscription.endDate}</span>
                      </p>
                    )}
                    {(subscription.paymentStatus === "unpaid" || subscription.status === "expired") && (() => {
                      // Pick the first enabled online gateway (SSLCommerz can't handle USD)
                      const currency = doctor?.currency ?? "BDT";
                      const gw = currency !== "USD" && gatewayStatus?.sslcommerz ? "sslcommerz"
                        : gatewayStatus?.shurjopay ? "shurjopay"
                        : gatewayStatus?.aamarpay ? "aamarpay"
                        : null;
                      return (
                        <div className="mt-2 space-y-1.5">
                          {gw ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={paying}
                              onClick={async () => {
                                setPaying(true);
                                try {
                                  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
                                  const token = localStorage.getItem("auth_token");
                                  const res = await fetch(`${apiBase}/api/doctors/me/subscription/pay/${gw}`, {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    },
                                    body: JSON.stringify({ months: 1 }),
                                  });
                                  const data = await res.json();
                                  if (data?.url) { window.location.href = data.url; return; }
                                  throw new Error("No URL");
                                } catch {
                                  toast({ title: "Online payment unavailable", description: "Please contact the admin to renew your subscription.", variant: "destructive" });
                                } finally {
                                  setPaying(false);
                                }
                              }}
                            >
                              Pay Online
                            </Button>
                          ) : null}
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                            {gw ? "Or contact" : "Please contact"} the admin to renew your subscription.
                          </p>
                        </div>
                      );
                    })()}
                    {subscription.months != null && subscription.monthlyFee != null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last plan: {subscription.months} month{subscription.months > 1 ? "s" : ""} × ৳{subscription.monthlyFee} = ৳{subscription.fee}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* ── Queue Display Devices Summary ── */}
        {(() => {
          const devices = displayDevices ?? [];
          const active = devices.filter(d => d.isActive !== false);
          const typeIconMap: Record<string, typeof Tv> = { tv: Tv, monitor: Monitor, mobile: Smartphone, tablet: Tablet, custom: MonitorSmartphone };
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Queue Display Screens</CardTitle>
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className={`h-2 w-2 rounded-full ${active.length > 0 ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                    <span className="text-xs text-muted-foreground">
                      {active.length} active{devices.length !== active.length ? ` · ${devices.length - active.length} inactive` : ""}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/doctor/queue-devices">Manage <ChevronRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                    <div className="p-3 rounded-full bg-muted">
                      <Monitor className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">No display screens set up</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Add a TV or kiosk screen to show the live queue to patients</p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/doctor/queue-devices">Set up a display</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {devices.map(d => {
                      const DevIcon = typeIconMap[d.displayType] ?? Monitor;
                      const url = `/display/${d.id}`;
                      return (
                        <div
                          key={d.id}
                          className={`flex flex-col gap-2 rounded-lg border p-3 transition-colors ${
                            d.isActive !== false
                              ? "bg-muted/30 border-border hover:border-primary/40"
                              : "bg-muted/10 border-dashed opacity-60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-1.5 rounded bg-background border shrink-0">
                                <DevIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{d.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{d.displayType} · {d.theme ?? "dark"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {d.voiceEnabled && (
                                <span title="Voice announcements on">
                                  <Volume2 className="h-3.5 w-3.5 text-blue-500" />
                                </span>
                              )}
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                d.isActive !== false
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {d.isActive !== false ? "ON" : "OFF"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <code className="text-[11px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-1 truncate font-mono">
                              {url}
                            </code>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-primary"
                              title="Open display screen"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
