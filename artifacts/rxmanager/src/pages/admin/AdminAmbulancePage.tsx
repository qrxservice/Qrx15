import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminAmbulanceStats, useAdminAmbulanceDrivers, useApproveDriver,
  useAdminAmbulanceRequests, useAdminAmbulanceMap, useAmbulanceSettings, useUpdateAmbulanceSettings,
  useSuspendDriver, useReactivateDriver,
  statusLabel, statusColor, VEHICLE_TYPES,
  type AmbulanceDriver, type AmbulanceRequest,
} from "@/lib/ambulance-api";
import AmbulanceMap from "@/components/ambulance/AmbulanceMap";
import {
  Ambulance, Users, Activity, AlertTriangle, CheckCircle, XCircle,
  MapPin, Phone, Star, Settings, TrendingUp, Clock,
} from "lucide-react";

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 text-center">
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminAmbulancePage() {
  const { toast } = useToast();
  const { data: stats } = useAdminAmbulanceStats();
  const { data: pendingDrivers, refetch: refetchPending } = useAdminAmbulanceDrivers("pending");
  const { data: allDrivers, refetch: refetchAll } = useAdminAmbulanceDrivers();
  const { data: suspendedDrivers, refetch: refetchSuspended } = useAdminAmbulanceDrivers("suspended");
  const { data: requests } = useAdminAmbulanceRequests();
  const { data: mapData } = useAdminAmbulanceMap();
  const { data: settings } = useAmbulanceSettings();
  const approveDriver = useApproveDriver();
  const suspendDriver = useSuspendDriver();
  const reactivateDriver = useReactivateDriver();
  const updateSettings = useUpdateAmbulanceSettings();

  const [rejectNote, setRejectNote] = useState<Record<number, string>>({});
  const [suspendNote, setSuspendNote] = useState<Record<number, string>>({});
  const [settingsForm, setSettingsForm] = useState<any>(null);

  const refetchAll_ = () => { refetchPending(); refetchAll(); refetchSuspended(); };

  const handleApprove = (id: number, status: "approved" | "rejected") => {
    approveDriver.mutate({ id, status, note: rejectNote[id] }, {
      onSuccess: () => { toast({ title: `Driver ${status}` }); refetchAll_(); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const handleSuspend = (id: number) => {
    suspendDriver.mutate({ id, note: suspendNote[id] }, {
      onSuccess: () => { toast({ title: "Driver suspended" }); refetchAll_(); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const handleReactivate = (id: number) => {
    reactivateDriver.mutate(id, {
      onSuccess: () => { toast({ title: "Driver reactivated" }); refetchAll_(); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const handleSettingToggle = (key: string, value: boolean | number) => {
    updateSettings.mutate({ [key]: value }, {
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const activeDrivers = allDrivers?.filter(d => d.onlineStatus !== "offline") ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <Ambulance className="h-6 w-6 text-red-600" />
          <h1 className="font-bold text-xl">Ambulance Command Centre</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="Total Approved" value={stats.total} color="text-gray-800" />
            <StatCard label="Available" value={stats.available} color="text-green-600" />
            <StatCard label="Busy" value={stats.busy} color="text-orange-500" />
            <StatCard label="Offline" value={stats.offline} color="text-gray-400" />
            <StatCard label="Pending Approval" value={stats.pendingApproval} color="text-yellow-600" />
            <StatCard label="Active Trips" value={stats.activeTrips} color="text-blue-600" />
            <StatCard label="SOS Pending" value={stats.sosPending} color="text-red-600" />
          </div>
        )}

        <Tabs defaultValue="map">
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="map">Live Map</TabsTrigger>
            <TabsTrigger value="pending">
              Pending {(pendingDrivers?.length ?? 0) > 0 && <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0">{pendingDrivers?.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="suspended">
              Suspended {(suspendedDrivers?.length ?? 0) > 0 && <Badge className="ml-1 bg-red-700 text-white text-xs px-1.5 py-0">{suspendedDrivers?.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* ── LIVE MAP ── */}
          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500 animate-pulse" />
                  Live Operations Map
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AmbulanceMap
                  drivers={mapData?.drivers.filter(d => d.lat != null) ?? []}
                  className="h-96 rounded-b-lg overflow-hidden"
                />
              </CardContent>
            </Card>
            {/* Active Requests table */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Active Requests</CardTitle></CardHeader>
              <CardContent>
                {mapData?.activeRequests.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active requests</p>}
                <div className="space-y-2">
                  {mapData?.activeRequests.map((r: AmbulanceRequest) => (
                    <div key={r.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        {r.isSos && <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />}
                        <span className="font-medium">#{r.id}</span>
                        <Badge className={statusColor(r.status)}>{statusLabel(r.status)}</Badge>
                        <span className="text-muted-foreground">{r.vehicleType}</span>
                      </div>
                      <span className="text-muted-foreground">{r.pickupAddress ?? `${r.pickupLat.toFixed(3)},${r.pickupLng.toFixed(3)}`}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PENDING APPROVALS ── */}
          <TabsContent value="pending" className="space-y-3">
            {pendingDrivers?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-400" />
                <p>No pending approvals</p>
              </div>
            )}
            {pendingDrivers?.map((driver: AmbulanceDriver) => (
              <Card key={driver.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{driver.name}</p>
                      <p className="text-sm text-muted-foreground">{driver.email} · {driver.phone}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span>NID: {driver.nidNumber ?? "Not provided"}</span>
                        <span>Licence: {driver.licenceNumber ?? "Not provided"}</span>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                  </div>
                  {driver.vehicles && driver.vehicles.length > 0 && (
                    <div className="text-xs bg-gray-50 rounded p-2">
                      {driver.vehicles.map(v => (
                        <span key={v.id}>{VEHICLE_TYPES.find(t => t.value === v.vehicleType)?.icon} {v.registrationNumber}</span>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Rejection reason (required if rejecting)…"
                      value={rejectNote[driver.id] ?? ""}
                      onChange={e => setRejectNote(n => ({ ...n, [driver.id]: e.target.value }))}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(driver.id, "approved")} disabled={approveDriver.isPending}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600" onClick={() => handleApprove(driver.id, "rejected")} disabled={approveDriver.isPending}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── ALL DRIVERS ── */}
          <TabsContent value="drivers" className="space-y-3">
            {allDrivers?.map((driver: AmbulanceDriver) => (
              <Card key={driver.id} className={driver.approvalStatus === "suspended" ? "border-red-200 bg-red-50/30" : ""}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-muted-foreground">{driver.phone} · {driver.email}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{driver.totalTrips} trips</span>
                        <span>৳{(driver.totalEarnings ?? 0).toLocaleString()}</span>
                        {driver.avgRating && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{driver.avgRating.toFixed(1)}</span>}
                      </div>
                      {driver.division && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          📍 {[driver.upazila, driver.district, driver.division].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge className={
                        driver.approvalStatus === "approved" ? "bg-green-100 text-green-700" :
                        driver.approvalStatus === "rejected" ? "bg-red-100 text-red-700" :
                        driver.approvalStatus === "suspended" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }>
                        {driver.approvalStatus}
                      </Badge>
                      {driver.approvalStatus === "approved" && (
                        <Badge className={driver.onlineStatus === "online" ? "bg-green-100 text-green-700" : driver.onlineStatus === "busy" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}>
                          {driver.onlineStatus}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Admin actions */}
                  {driver.approvalStatus === "approved" && (
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Suspension reason…"
                        value={suspendNote[driver.id] ?? ""}
                        onChange={e => setSuspendNote(n => ({ ...n, [driver.id]: e.target.value }))}
                        className="h-7 text-xs flex-1"
                      />
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600 shrink-0"
                        onClick={() => handleSuspend(driver.id)} disabled={suspendDriver.isPending}>
                        Suspend
                      </Button>
                    </div>
                  )}
                  {driver.approvalStatus === "suspended" && (
                    <div className="flex items-center gap-2">
                      {driver.approvalNote && <p className="text-xs text-red-700 flex-1">Reason: {driver.approvalNote}</p>}
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 shrink-0"
                        onClick={() => handleReactivate(driver.id)} disabled={reactivateDriver.isPending}>
                        Reactivate
                      </Button>
                    </div>
                  )}
                  {driver.approvalStatus === "rejected" && (
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handleReactivate(driver.id)} disabled={reactivateDriver.isPending}>
                      Reinstate as Approved
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── SUSPENDED DRIVERS ── */}
          <TabsContent value="suspended" className="space-y-3">
            {(suspendedDrivers?.length ?? 0) === 0 && (
              <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">No suspended drivers.</CardContent></Card>
            )}
            {suspendedDrivers?.map((driver: AmbulanceDriver) => (
              <Card key={driver.id} className="border-red-200 bg-red-50/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-muted-foreground">{driver.phone} · {driver.email}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{driver.totalTrips} trips</span>
                        <span>৳{(driver.totalEarnings ?? 0).toLocaleString()}</span>
                        {driver.avgRating && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{driver.avgRating.toFixed(1)}</span>}
                      </div>
                      {driver.approvalNote && (
                        <p className="text-xs text-red-700 mt-1">🚫 Reason: {driver.approvalNote}</p>
                      )}
                    </div>
                    <Badge className="bg-red-100 text-red-700">suspended</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handleReactivate(driver.id)} disabled={reactivateDriver.isPending}>
                      ✓ Reactivate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── REQUESTS ── */}
          <TabsContent value="requests" className="space-y-3">
            {requests?.map((req: AmbulanceRequest) => (
              <Card key={req.id} className={req.isSos ? "border-red-300" : ""}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {req.isSos && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <span className="font-medium text-sm">#{req.id}</span>
                      <Badge className={statusColor(req.status)}>{statusLabel(req.status)}</Badge>
                      <span className="text-xs text-muted-foreground">{VEHICLE_TYPES.find(v => v.value === req.vehicleType)?.icon} {req.vehicleType}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(req.requestedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-green-500 mt-0.5" />
                    <span className="text-muted-foreground">{req.pickupAddress ?? `${req.pickupLat.toFixed(4)},${req.pickupLng.toFixed(4)}`}</span>
                  </div>
                  {req.actualFare && <p className="text-xs text-green-600 font-medium">Fare: ৳{req.actualFare}</p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── SETTINGS ── */}
          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Revenue & System Settings</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {settings && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Commission System</p>
                        <p className="text-xs text-muted-foreground">Deduct platform fee from driver earnings</p>
                      </div>
                      <Switch checked={settings.commissionEnabled} onCheckedChange={v => handleSettingToggle("commissionEnabled", v)} />
                    </div>
                    {settings.commissionEnabled && (
                      <div className="space-y-1 ml-4">
                        <Label className="text-sm">Commission Rate (%)</Label>
                        <Input type="number" defaultValue={settings.commissionRate} className="w-24"
                          onBlur={e => handleSettingToggle("commissionRate", parseFloat(e.target.value))} />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Driver Subscription Plans</p>
                        <p className="text-xs text-muted-foreground">Allow drivers to subscribe for premium features</p>
                      </div>
                      <Switch checked={settings.subscriptionEnabled} onCheckedChange={v => handleSettingToggle("subscriptionEnabled", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Featured Listings</p>
                        <p className="text-xs text-muted-foreground">Drivers can pay to appear first in search</p>
                      </div>
                      <Switch checked={settings.featuredListingEnabled} onCheckedChange={v => handleSettingToggle("featuredListingEnabled", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Driver Verification Fee</p>
                        <p className="text-xs text-muted-foreground">Charge a fee for document verification</p>
                      </div>
                      <Switch checked={settings.driverVerificationFeeEnabled} onCheckedChange={v => handleSettingToggle("driverVerificationFeeEnabled", v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-1">
                        <Label className="text-sm">Base Fare (BDT)</Label>
                        <Input type="number" defaultValue={settings.baseFareBdt}
                          onBlur={e => handleSettingToggle("baseFareBdt", parseInt(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Per KM Rate (BDT)</Label>
                        <Input type="number" defaultValue={settings.perKmRateBdt}
                          onBlur={e => handleSettingToggle("perKmRateBdt", parseInt(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Offline Timeout (minutes)</Label>
                        <Input type="number" defaultValue={settings.offlineTimeoutMinutes}
                          onBlur={e => handleSettingToggle("offlineTimeoutMinutes", parseInt(e.target.value))} />
                        <p className="text-xs text-muted-foreground">Driver auto-set offline after this many minutes with no GPS update</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
