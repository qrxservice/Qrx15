import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Wifi, RefreshCw, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DisplayConnection {
  doctorId: number;
  doctorName: string;
  chamberAddress: string | null;
  doctorStatus: string;
  connections: number;
  room: string;
}

interface ConnectionsData {
  connections: DisplayConnection[];
  totalDisplays: number;
  activeDoctors: number;
}

export default function AdminDisplaysPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ConnectionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/display-connections", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (res.ok) {
        const json = (await res.json()) as ConnectionsData;
        setData(json);
        setLastFetched(new Date());
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    void fetchConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      online: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      busy: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      offline: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    };
    return map[status] ?? map.offline;
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Queue Display Monitor</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Live display screens connected to chambers
              {lastFetched && (
                <span className="ml-2 text-xs opacity-60">
                  · Last updated {lastFetched.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchConnections} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.totalDisplays ?? 0}</p>
                  <p className="text-muted-foreground text-sm">Connected Screens</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.activeDoctors ?? 0}</p>
                  <p className="text-muted-foreground text-sm">Active Chambers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connections table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wifi className="h-4 w-4 text-teal-500" />
              Active Display Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data || data.connections.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Monitor className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No display screens currently connected.</p>
                <p className="text-xs mt-1 opacity-60">
                  Screens appear here when a /display/:deviceId page is open.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.connections.map((c) => (
                  <div key={c.doctorId} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.doctorName}</p>
                      {c.chamberAddress && (
                        <p className="text-muted-foreground text-xs mt-0.5 truncate">
                          {c.chamberAddress}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${statusBadge(c.doctorStatus)}`}
                      >
                        {c.doctorStatus}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400">
                        <Monitor className="h-4 w-4" />
                        <span>{c.connections}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-4 space-y-1">
          <p className="font-medium">How display screens work</p>
          <p>Each doctor can manage their display screens from <strong>Doctor Panel → Queue Display Devices</strong>.</p>
          <p>The display URL is <code className="bg-muted px-1 rounded">/display/:deviceId</code> — open it on any TV, kiosk, or browser without login.</p>
          <p>Screens update instantly via WebSocket when the queue changes. This monitor refreshes on demand only.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
