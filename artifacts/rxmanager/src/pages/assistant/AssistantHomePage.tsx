import { useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListAppointments, useListQueue } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, Users, CheckCircle2, XCircle, Activity, Clock,
  FlaskConical, CalendarClock, FileText, ClipboardList, ChevronRight,
  Stethoscope, Coffee, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().split("T")[0];

function authFetch(path: string) {
  const token = localStorage.getItem("auth_token");
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Stethoscope }> = {
  online:   { label: "Available",  color: "text-green-600 bg-green-50 border-green-200", icon: Stethoscope },
  busy:     { label: "On Break",   color: "text-amber-600 bg-amber-50 border-amber-200", icon: Coffee },
  vacation: { label: "Vacation",   color: "text-blue-600 bg-blue-50 border-blue-200",   icon: Calendar },
  offline:  { label: "Day Ended",  color: "text-slate-600 bg-slate-50 border-slate-200", icon: Moon },
};

function ActionLabel({ action, entityType }: { action: string; entityType: string }) {
  const map: Record<string, string> = {
    "create-appointment": "Appointment Created",
    "update-appointment": "Appointment Updated",
    "create":             entityType === "appointment" ? "Appointment Created" : entityType === "prescription" ? "Prescription Created" : "Created",
    "update":             entityType === "appointment" ? "Appointment Updated" : "Updated",
    "delete":             "Deleted",
    "reset-password":     "Password Reset",
    "upload-report":      "Report Uploaded",
  };
  return <>{map[action] ?? `${action} (${entityType})`}</>;
}

export default function AssistantHomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const doctorId = user?.doctorId ?? 0;
  const date = today();

  const { data: apptData } = useListAppointments(
    { doctorId, date, limit: 100 },
    { query: { queryKey: ["asst-home-appts", doctorId, date], enabled: !!doctorId } },
  );
  const { data: queueData } = useListQueue(
    { doctorId, date },
    { query: { queryKey: ["asst-home-queue", doctorId, date], enabled: !!doctorId } },
  );
  const { data: extraStats } = useQuery({
    queryKey: ["asst-stats", doctorId],
    queryFn: () => authFetch("/api/assistant/stats"),
    enabled: !!doctorId,
    refetchInterval: 60000,
  });
  const { data: doctorStatus } = useQuery({
    queryKey: ["asst-doctor-status", doctorId],
    queryFn: () => authFetch("/api/assistant/doctor-status"),
    enabled: !!doctorId,
    refetchInterval: 30000,
  });
  const { data: activity } = useQuery({
    queryKey: ["asst-activity", doctorId],
    queryFn: () => authFetch("/api/assistant/activity"),
    enabled: !!doctorId,
    refetchInterval: 60000,
  });

  const appts = apptData?.appointments ?? [];
  const totalToday = appts.length;
  const waiting = queueData?.waiting?.length ?? 0;
  const serving = queueData?.serving?.[0] ?? null;
  const completed = queueData?.seen?.length ?? 0;
  const missed = queueData?.skipped?.length ?? 0;

  const status = doctorStatus?.onlineStatus ?? "offline";
  const StatusIcon = STATUS_MAP[status]?.icon ?? Stethoscope;

  const activityList: any[] = Array.isArray(activity) ? activity : [];

  const statCards = [
    { label: "Total Today", value: totalToday, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Waiting",     value: waiting,    icon: Clock,     color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Completed",   value: completed,  icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Missed",      value: missed,     icon: XCircle,   color: "text-red-600", bg: "bg-red-50" },
  ];

  const dashCards = [
    { label: "Pending Investigation", value: extraStats?.pendingInvestigation ?? "—", icon: FlaskConical, color: "text-purple-600", bg: "bg-purple-50", href: "/assistant/prescriptions" },
    { label: "Follow-up Due",         value: extraStats?.followUpDue ?? "—",          icon: CalendarClock, color: "text-orange-600", bg: "bg-orange-50", href: "/assistant/prescriptions" },
    { label: "Reports Received Today", value: extraStats?.reportsReceivedToday ?? "—", icon: FileText,      color: "text-teal-600", bg: "bg-teal-50", href: "/assistant/appointments" },
  ];

  return (
    <DashboardLayout role="assistant">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.name ?? "Assistant"}</h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Doctor Status Banner */}
        {doctorStatus && (
          <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", STATUS_MAP[status]?.color)}>
            <StatusIcon className="h-5 w-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{doctorStatus.name ?? "Doctor"}</p>
              <p className="text-xs opacity-75">{STATUS_MAP[status]?.label ?? status}</p>
            </div>
            <Badge variant="outline" className={cn("shrink-0", STATUS_MAP[status]?.color)}>
              {STATUS_MAP[status]?.label ?? status}
            </Badge>
          </div>
        )}

        {/* Today's Appointment Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map(card => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg mb-3", card.bg)}>
                  <card.icon className={cn("h-5 w-5", card.color)} />
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Queue Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Live Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {serving ? (
                <div className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
                  <div className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    #{serving.serialNo}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{serving.patientName}</p>
                    <p className="text-xs text-muted-foreground">Currently serving</p>
                  </div>
                  <Badge className="ml-auto shrink-0 bg-green-600">Serving</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No patient currently being served</p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">In queue</span>
                <span className="font-semibold">{waiting} waiting</span>
              </div>
              <Link href="/assistant/queue">
                <span className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                  Manage queue <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
            </CardContent>
          </Card>

          {/* Dashboard Summary Cards */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Pending Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashCards.map(card => (
                <Link key={card.label} href={card.href}>
                  <div className="flex items-center gap-3 rounded-lg hover:bg-muted/50 px-2 py-1.5 cursor-pointer transition-colors">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", card.bg)}>
                      <card.icon className={cn("h-4 w-4", card.color)} />
                    </div>
                    <span className="flex-1 text-sm">{card.label}</span>
                    <span className={cn("font-bold text-sm", card.color)}>{card.value}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {activityList.slice(0, 10).map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                      {(entry.actorName ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <ActionLabel action={entry.action} entityType={entry.entityType} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actorName ?? "Unknown"} · {entry.actorRole}
                        {entry.details ? ` · ${String(entry.details).slice(0, 40)}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
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
