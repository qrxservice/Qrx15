import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Droplets, Users, HeartPulse, AlertTriangle, Ban, Search, Loader2 } from "lucide-react";

interface DonorRow {
  id: number; name: string | null; email: string; phone: string | null;
  bloodGroup: string | null; country: string | null; division: string | null;
  district: string | null; area: string | null; isDonor: string;
  donorStatus: string | null; lastDonationDate: string | null; createdAt: string;
}

interface EmergencyRequest {
  id: number; bloodGroup: string; quantity: string; hospital: string;
  city: string; contactNumber: string; notes: string | null;
  status: string; createdAt: string;
}

export default function AdminBloodDonorsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [donors, setDonors] = useState<DonorRow[]>([]);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"donors" | "emergency">("donors");
  const [disabling, setDisabling] = useState<number | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [donorRes, emRes] = await Promise.all([
        fetch(`${apiBase}/api/admin/blood-donors`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/api/admin/emergency-blood-requests`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const donorData = await donorRes.json();
      const emData = await emRes.json();
      setDonors(donorData.donors ?? []);
      setStats(donorData.stats ?? { total: 0, active: 0 });
      setEmergencyRequests(emData.requests ?? []);
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  const disableDonor = async (userId: number) => {
    if (!confirm("Disable this donor? They will be marked inactive and removed from search results.")) return;
    setDisabling(userId);
    try {
      const res = await fetch(`${apiBase}/api/admin/blood-donors/${userId}/disable`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Donor disabled" });
      await fetchData();
    } catch {
      toast({ title: "Failed to disable donor", variant: "destructive" });
    } finally {
      setDisabling(null);
    }
  };

  const closeEmergency = async (id: number) => {
    try {
      await fetch(`${apiBase}/api/admin/emergency-blood-requests/${id}/close`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchData();
      toast({ title: "Request closed" });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const filtered = donors.filter(d =>
    !search ||
    (d.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (d.bloodGroup ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (d.district ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Droplets className="h-6 w-6 text-red-500" />Blood Donor Management
          </h1>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Donors</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <HeartPulse className="h-8 w-8 text-green-500" />
              <div><p className="text-2xl font-bold">{stats.active}</p><p className="text-sm text-muted-foreground">Active Donors</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{emergencyRequests.filter(r => r.status === "open").length}</p>
                <p className="text-sm text-muted-foreground">Open Emergency Requests</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {(["donors", "emergency"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {t === "donors" ? `Donors (${filtered.length})` : `Emergency Requests (${emergencyRequests.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tab === "donors" ? (
          <div className="space-y-3">
            <div className="relative max-w-xs">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name, blood group, district..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {filtered.map(d => (
              <Card key={d.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{d.name ?? "Unnamed"}</p>
                      <Badge className="bg-red-100 text-red-700 border-red-200 font-bold">{d.bloodGroup}</Badge>
                      {d.donorStatus === "available"
                        ? <Badge className="bg-green-100 text-green-700 border-green-200">Available</Badge>
                        : <Badge variant="secondary">{d.donorStatus}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{d.email} · {d.phone ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[d.area, d.district, d.division, d.country].filter(Boolean).join(", ") || "—"}
                    </p>
                    {d.lastDonationDate && <p className="text-xs text-muted-foreground">Last donation: {d.lastDonationDate}</p>}
                  </div>
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={disabling === d.id}
                    onClick={() => disableDonor(d.id)}
                  >
                    {disabling === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                    Disable
                  </Button>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No donors found.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {emergencyRequests.map(r => (
              <Card key={r.id} className={r.status === "open" ? "border-red-200 dark:border-red-900" : ""}>
                <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-red-100 text-red-700 border-red-200 font-bold">{r.bloodGroup}</Badge>
                      <Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge>
                    </div>
                    <p className="text-sm font-medium">{r.quantity} · {r.hospital} · {r.city}</p>
                    <p className="text-sm">Contact: <span className="font-medium">{r.contactNumber}</span></p>
                    {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  {r.status === "open" && (
                    <Button size="sm" variant="outline" onClick={() => closeEmergency(r.id)}>
                      Close
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {emergencyRequests.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No emergency requests.</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
