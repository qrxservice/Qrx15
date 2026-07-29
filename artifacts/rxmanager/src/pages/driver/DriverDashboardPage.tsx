import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  useDriverProfile, useSetDriverStatus, useUpdateDriverLocation,
  useDriverActiveRequest, useAcceptRequest, useUpdateRequestStatus,
  useDriverStats,
  VEHICLE_TYPES, statusLabel, statusColor, type RequestStatus,
} from "@/lib/ambulance-api";
import {
  Ambulance, MapPin, Phone, Star, TrendingUp, History,
  CheckCircle, XCircle, Navigation, AlertTriangle, User,
  DollarSign, Calendar, Bell,
} from "lucide-react";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { io, type Socket } from "socket.io-client";

export default function DriverDashboardPage() {
  const { toast } = useToast();
  const { data: driver, isLoading } = useDriverProfile();
  const setStatus = useSetDriverStatus();
  const updateLocation = useUpdateDriverLocation();
  const { data: activeRequest, refetch: refetchActive } = useDriverActiveRequest();
  const { data: stats } = useDriverStats();
  const acceptRequest = useAcceptRequest();
  const updateStatus = useUpdateRequestStatus();

  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // ── Socket.IO: real-time incoming request notifications ─────────────────────
  useEffect(() => {
    if (!driver || driver.approvalStatus !== "approved") return;

    const socket: Socket = io(`${window.location.protocol}//${window.location.host}`, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Join driver-specific room
      socket.emit("join", { room: `ambulance:driver-${driver.id}` });
    });

    socket.on("request:new", () => {
      refetchActive();
      toast({
        title: "🚑 New ambulance request!",
        description: "A passenger needs a ride. Check the request now.",
      });
    });

    socket.on("request:sos", () => {
      refetchActive();
      toast({
        title: "🚨 SOS Emergency!",
        description: "Emergency ambulance request received. Respond immediately.",
        variant: "destructive",
      });
    });

    socket.on("driver:status_changed", () => {
      refetchActive();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [driver?.id, driver?.approvalStatus]);

  // ── GPS tracking ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (driver?.onlineStatus === "online" || driver?.onlineStatus === "busy") {
      if (!locationWatchId && navigator.geolocation) {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            updateLocation.mutate({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading ?? undefined,
              speed: pos.coords.speed ?? undefined,
            });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
        );
        setLocationWatchId(id);
      }
    } else {
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        setLocationWatchId(null);
      }
    }
    return () => {
      if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId);
    };
  }, [driver?.onlineStatus]);

  const toggleOnline = useCallback(() => {
    if (!driver) return;
    const newStatus = driver.onlineStatus === "online" ? "offline" : "online";
    setStatus.mutate(newStatus, {
      onSuccess: () => toast({ title: `You are now ${newStatus}` }),
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  }, [driver]);

  const handleAccept = (id: number) => {
    acceptRequest.mutate(id, {
      onSuccess: () => { toast({ title: "Request accepted!" }); refetchActive(); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateStatus.mutate({ id, status }, {
      onSuccess: () => { toast({ title: `Status: ${statusLabel(status as RequestStatus)}` }); refetchActive(); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Ambulance className="h-8 w-8 animate-pulse text-red-500" />
    </div>
  );

  if (!driver) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-muted-foreground">Driver profile not found.</p>
      <Link href="/driver/register"><Button>Register as Driver</Button></Link>
    </div>
  );

  if (driver.approvalStatus === "pending") return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
      <div className="p-4 bg-orange-100 rounded-full"><Ambulance className="h-10 w-10 text-orange-500" /></div>
      <h2 className="text-xl font-semibold">Application Under Review</h2>
      <p className="text-muted-foreground text-center max-w-sm">Your driver application is pending admin approval. You'll be notified once approved.</p>
    </div>
  );

  if (driver.approvalStatus === "rejected") return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
      <div className="p-4 bg-red-100 rounded-full"><XCircle className="h-10 w-10 text-red-500" /></div>
      <h2 className="text-xl font-semibold">Application Rejected</h2>
      <p className="text-muted-foreground text-center max-w-sm">{driver.approvalNote ?? "Your application was rejected."}</p>
    </div>
  );

  if (driver.approvalStatus === "suspended") return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
      <div className="p-4 bg-red-100 rounded-full"><AlertTriangle className="h-10 w-10 text-red-500" /></div>
      <h2 className="text-xl font-semibold">Account Suspended</h2>
      <p className="text-muted-foreground text-center max-w-sm">{driver.approvalNote ?? "Your account has been suspended. Contact support for assistance."}</p>
    </div>
  );

  const vehicleLabel = VEHICLE_TYPES.find(v => v.value === driver.vehicles?.[0]?.vehicleType)?.label ?? "Basic Ambulance";

  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl">Dashboard</h1>
            <p className="text-xs text-muted-foreground">{vehicleLabel}</p>
          </div>
          <Badge className={
            driver.onlineStatus === "online" ? "bg-green-100 text-green-700" :
            driver.onlineStatus === "busy" ? "bg-orange-100 text-orange-700" :
            "bg-gray-100 text-gray-600"
          }>
            {driver.onlineStatus.toUpperCase()}
          </Badge>
        </div>

        {/* Online Toggle */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Go {driver.onlineStatus === "online" ? "Offline" : "Online"}</p>
                <p className="text-sm text-muted-foreground">
                  {driver.onlineStatus === "online"
                    ? "You are visible to passengers"
                    : driver.onlineStatus === "busy"
                    ? "Completing current trip"
                    : "You won't receive requests"}
                </p>
              </div>
              <Switch
                checked={driver.onlineStatus === "online"}
                onCheckedChange={toggleOnline}
                disabled={setStatus.isPending || driver.onlineStatus === "busy"}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Today's stats mini-bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-700">{stats.today.trips}</p>
              <p className="text-[10px] text-muted-foreground">Today's Trips</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-lg font-bold text-green-700">৳{stats.today.earnings.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Today's Earnings</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <p className="text-lg font-bold text-purple-700">{stats.month.trips}</p>
              <p className="text-[10px] text-muted-foreground">Monthly Trips</p>
            </div>
          </div>
        )}

        {/* Active Request */}
        {activeRequest && (
          <Card className={`border-2 ${activeRequest.isSos ? "border-red-500 bg-red-50" : "border-blue-400"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {activeRequest.isSos && <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />}
                {activeRequest.status === "pending" ? "Incoming Request" : "Active Trip"}
                <Badge className={statusColor(activeRequest.status)}>{statusLabel(activeRequest.status)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span>{activeRequest.pickupAddress ?? `${activeRequest.pickupLat.toFixed(4)}, ${activeRequest.pickupLng.toFixed(4)}`}</span>
              </div>
              {activeRequest.dropAddress && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{activeRequest.dropAddress}</span>
                </div>
              )}
              {activeRequest.user && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{activeRequest.user.name ?? "Patient"}</span>
                  {activeRequest.user.phone && (
                    <a href={`tel:${activeRequest.user.phone}`} className="ml-auto flex items-center gap-1 text-blue-600">
                      <Phone className="h-3 w-3" /> Call
                    </a>
                  )}
                </div>
              )}
              {activeRequest.patientName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>Patient: {activeRequest.patientName}</span>
                </div>
              )}
              {activeRequest.patientCondition && (
                <p className="text-sm bg-yellow-50 border border-yellow-200 rounded p-2">
                  <strong>Condition:</strong> {activeRequest.patientCondition}
                </p>
              )}
              {activeRequest.estimatedFare && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Est. fare: ৳{activeRequest.estimatedFare}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                {activeRequest.status === "pending" && (
                  <>
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleAccept(activeRequest.id)} disabled={acceptRequest.isPending}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600" onClick={() => handleStatusUpdate(activeRequest.id, "cancelled")}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </>
                )}
                {activeRequest.status === "accepted" && (
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusUpdate(activeRequest.id, "en_route")}>
                    <Navigation className="h-4 w-4 mr-1" /> Start Driving
                  </Button>
                )}
                {activeRequest.status === "en_route" && (
                  <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => handleStatusUpdate(activeRequest.id, "arrived")}>
                    <MapPin className="h-4 w-4 mr-1" /> Arrived at Pickup
                  </Button>
                )}
                {activeRequest.status === "arrived" && (
                  <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => handleStatusUpdate(activeRequest.id, "in_progress")}>
                    <Ambulance className="h-4 w-4 mr-1" /> Start Trip
                  </Button>
                )}
                {activeRequest.status === "in_progress" && (
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(activeRequest.id, "completed")}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Complete Trip
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!activeRequest && driver.onlineStatus === "online" && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-8 text-center text-muted-foreground gap-2">
              <Bell className="h-8 w-8 text-gray-300 animate-pulse" />
              <p>Waiting for requests…</p>
              <p className="text-xs">You'll be notified in real-time when a new request comes in.</p>
            </CardContent>
          </Card>
        )}

        {/* All-time Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{driver.totalTrips}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Trips</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600">৳{(driver.totalEarnings ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <p className="text-2xl font-bold">{driver.avgRating?.toFixed(1) ?? "—"}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{driver.ratingCount} ratings</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/driver/trips">
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardContent className="pt-4 flex items-center gap-3">
                <History className="h-5 w-5 text-gray-500" />
                <span className="font-medium text-sm">Trip History</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/driver/earnings">
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardContent className="pt-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="font-medium text-sm">Earnings</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DriverLayout>
  );
}
