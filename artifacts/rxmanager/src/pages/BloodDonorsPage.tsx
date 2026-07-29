import { useState } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Droplets, Search, MapPin, AlertTriangle, User, Calendar, Loader2, Send, Heart } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface DonorProfile {
  id: number;
  name: string | null;
  bloodGroup: string | null;
  country: string | null;
  division: string | null;
  district: string | null;
  area: string | null;
  donorStatus: string | null;
  lastDonationDate: string | null;
  profilePicture: string | null;
}

function statusBadge(status: string | null) {
  if (status === "available") return <Badge className="bg-green-100 text-green-700 border-green-200">Available</Badge>;
  return <Badge variant="secondary">Unavailable</Badge>;
}

function DonorCard({ donor, onRequest }: { donor: DonorProfile; onRequest: (donor: DonorProfile) => void }) {
  const location = [donor.area, donor.district, donor.division, donor.country].filter(Boolean).join(", ");
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <Droplets className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{donor.name ?? "Anonymous Donor"}</p>
              <Badge className="bg-red-100 text-red-700 border-red-200 font-bold text-sm">{donor.bloodGroup}</Badge>
            </div>
            {location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />{location}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
              <div className="flex items-center gap-2">
                {statusBadge(donor.donorStatus)}
                {donor.lastDonationDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />Last donation: {donor.lastDonationDate}
                  </span>
                )}
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onRequest(donor)}>
                <Send className="h-3.5 w-3.5" />Request Blood
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestModal({ donor, onClose, apiBase, token }: {
  donor: DonorProfile; onClose: () => void; apiBase: string; token: string | null;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!token) { toast({ title: "Please log in to request blood", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/blood-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ donorId: donor.id, bloodGroup: donor.bloodGroup, message }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed");
      }
      toast({ title: "Request sent!", description: "The donor will be notified." });
      onClose();
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed to send request", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="h-4 w-4 text-red-500" />
            Request Blood from {donor.name ?? "Donor"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <p><span className="font-medium">Blood Group:</span> {donor.bloodGroup}</p>
            <p><span className="font-medium">Location:</span> {[donor.area, donor.district, donor.division].filter(Boolean).join(", ") || "—"}</p>
          </div>
          {!token && (
            <p className="text-sm text-destructive font-medium">You must be logged in to request blood.</p>
          )}
          <div className="space-y-1.5">
            <Label>Message (optional)</Label>
            <Textarea
              placeholder="Briefly explain your need (hospital, urgency, patient info)..."
              value={message} onChange={e => setMessage(e.target.value)} rows={3}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The donor will receive a notification. Their contact details will be shared with you only if they accept.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleSend} disabled={loading || !token} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmergencyForm({ apiBase }: { apiBase: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ bloodGroup: "", quantity: "", hospital: "", city: "", contactNumber: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.bloodGroup || !form.quantity || !form.hospital || !form.city || !form.contactNumber) {
      toast({ title: "Please fill all required fields", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/emergency-blood-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      toast({
        title: "Emergency request submitted!",
        description: `${d.donorsNotified ?? 0} matching donor(s) notified.`,
      });
      setForm({ bloodGroup: "", quantity: "", hospital: "", city: "", contactNumber: "", notes: "" });
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-red-600">
          <AlertTriangle className="h-4 w-4" />Emergency Blood Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Fill this form for urgent blood needs. All matching available donors in the system will be notified immediately.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Blood Group *</Label>
            <Select value={form.bloodGroup} onValueChange={v => setForm(p => ({ ...p, bloodGroup: v }))}>
              <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity (units) *</Label>
            <Input placeholder="e.g. 2 units" value={form.quantity} onChange={f("quantity")} />
          </div>
          <div className="space-y-1.5">
            <Label>Hospital *</Label>
            <Input placeholder="Hospital name" value={form.hospital} onChange={f("hospital")} />
          </div>
          <div className="space-y-1.5">
            <Label>City *</Label>
            <Input placeholder="City" value={form.city} onChange={f("city")} />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Number *</Label>
            <Input placeholder="+880..." value={form.contactNumber} onChange={f("contactNumber")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea placeholder="Additional information..." value={form.notes} onChange={f("notes")} rows={2} />
        </div>
        <Button onClick={handleSubmit} disabled={loading} className="gap-2 bg-red-600 hover:bg-red-700">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          Submit Emergency Request
        </Button>
      </CardContent>
    </Card>
  );
}

export default function BloodDonorsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [tab, setTab] = useState<"search" | "nearby" | "emergency">("search");
  const [filters, setFilters] = useState({ bloodGroup: "", country: "", division: "", district: "", area: "" });
  const [donors, setDonors] = useState<DonorProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [requestTarget, setRequestTarget] = useState<DonorProfile | null>(null);

  const f = (field: string) => (v: string) => setFilters(p => ({ ...p, [field]: v }));

  const search = async (mode: "search" | "nearby") => {
    setLoading(true);
    setSearched(false);
    try {
      const params = new URLSearchParams();
      if (filters.bloodGroup) params.set("bloodGroup", filters.bloodGroup);
      if (filters.country) params.set("country", filters.country);
      if (filters.division) params.set("division", filters.division);
      if (filters.district) params.set("district", filters.district);
      if (filters.area) params.set("area", filters.area);
      const endpoint = mode === "nearby" ? "blood-donors/nearby" : "blood-donors";
      const res = await fetch(`${apiBase}/api/${endpoint}?${params}`);
      const data = await res.json();
      setDonors(data.donors ?? []);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const FilterPanel = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label>Blood Group</Label>
          <Select value={filters.bloodGroup} onValueChange={f("bloodGroup")}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              {BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Input placeholder="e.g. Bangladesh" value={filters.country}
            onChange={e => setFilters(p => ({ ...p, country: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Division / State</Label>
          <Input placeholder="e.g. Dhaka" value={filters.division}
            onChange={e => setFilters(p => ({ ...p, division: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>District</Label>
          <Input placeholder="e.g. Dhaka" value={filters.district}
            onChange={e => setFilters(p => ({ ...p, district: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>City / Area</Label>
          <Input placeholder="e.g. Mirpur" value={filters.area}
            onChange={e => setFilters(p => ({ ...p, area: e.target.value }))} />
        </div>
      </div>
    </div>
  );

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-red-50 border border-red-100 mb-2">
            <Droplets className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold">Blood Donor Search</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Find verified blood donors near you. Donors are real registered users who volunteered to help.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 border-b pb-1">
          {([
            { key: "search", label: "Search Donors", icon: Search },
            { key: "nearby", label: "Nearby Donors", icon: MapPin },
            { key: "emergency", label: "Emergency Request", icon: AlertTriangle },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setDonors([]); setSearched(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-[1px] ${
                tab === key
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              } ${key === "emergency" ? "text-red-600 hover:text-red-700" : ""}`}
            >
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "search" && (
          <div className="space-y-4">
            <FilterPanel />
            <Button onClick={() => search("search")} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search Donors
            </Button>
            {searched && donors.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Droplets className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No available donors found matching your search.</p>
              </div>
            )}
            {donors.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{donors.length} donor(s) found</p>
                {donors.map(d => (
                  <DonorCard key={d.id} donor={d} onRequest={setRequestTarget} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "nearby" && (
          <div className="space-y-4">
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Priority Order</p>
                <p>Results are sorted by location proximity: same city → same district → same division → same country.</p>
                <p className="mt-1">Enter your location below to find the nearest available donors.</p>
              </CardContent>
            </Card>
            <FilterPanel />
            <Button onClick={() => search("nearby")} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Find Nearby Donors
            </Button>
            {searched && donors.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No nearby donors found. Try broadening your location filters.</p>
              </div>
            )}
            {donors.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{donors.length} nearby donor(s)</p>
                {donors.map(d => (
                  <DonorCard key={d.id} donor={d} onRequest={setRequestTarget} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "emergency" && <EmergencyForm apiBase={apiBase} />}
      </div>

      {requestTarget && (
        <RequestModal
          donor={requestTarget}
          onClose={() => setRequestTarget(null)}
          apiBase={apiBase}
          token={token}
        />
      )}
    </PublicLayout>
  );
}
