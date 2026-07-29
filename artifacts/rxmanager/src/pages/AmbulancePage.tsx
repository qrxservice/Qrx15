import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAvailableAmbulances, useActiveRequest, useCreateRequest, useCancelRequest,
  useRateTrip, VEHICLE_TYPES, statusLabel, statusColor, type VehicleType, type AvailableDriver,
} from "@/lib/ambulance-api";
import {
  Ambulance, MapPin, Phone, Star, AlertTriangle, Navigation,
  Clock, CheckCircle, XCircle, Filter, RefreshCw,
} from "lucide-react";
import AmbulanceMap from "@/components/ambulance/AmbulanceMap";

export default function AmbulancePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState<number | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState("");
  const [form, setForm] = useState({
    pickupAddress: "", dropAddress: "", patientName: "", patientCondition: "", notes: "",
    vehicleType: "basic" as VehicleType, driverId: null as number | null,
  });

  const { data: available, isLoading: loadingAvailable, refetch } = useAvailableAmbulances(
    userLocation ? { vehicleType: vehicleFilter || undefined, lat: userLocation.lat, lng: userLocation.lng } : { vehicleType: vehicleFilter || undefined }
  );
  const { data: activeRequest, refetch: refetchActive } = useActiveRequest();
  const createRequest = useCreateRequest();
  const cancelRequest = useCancelRequest();
  const rateTrip = useRateTrip();

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
  }, []);

  const handleSOS = useCallback(() => {
    if (!userLocation) { toast({ title: "Location required", description: "Please allow location access.", variant: "destructive" }); return; }
    createRequest.mutate({
      vehicleType: "basic", isSos: true,
      pickupLat: userLocation.lat, pickupLng: userLocation.lng,
      pickupAddress: `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`,
    }, {
      onSuccess: () => { toast({ title: "🚨 SOS Sent!", description: "Nearby ambulances have been alerted." }); refetchActive(); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  }, [userLocation]);

  const handleRequest = () => {
    if (!userLocation) { toast({ title: "Location required", variant: "destructive" }); return; }
    createRequest.mutate({
      ...form,
      pickupLat: userLocation.lat, pickupLng: userLocation.lng,
    }, {
      onSuccess: () => { toast({ title: "Request sent!" }); setShowRequestForm(false); refetchActive(); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const handleCancel = () => {
    if (!activeRequest) return;
    cancelRequest.mutate({ id: activeRequest.id, reason: "Cancelled by user" }, {
      onSuccess: () => { toast({ title: "Request cancelled" }); refetchActive(); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const handleRate = () => {
    if (!showRatingForm) return;
    rateTrip.mutate({ id: showRatingForm, rating: ratingValue, review: ratingReview }, {
      onSuccess: () => { toast({ title: "Thank you for your rating!" }); setShowRatingForm(null); },
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const nearbyCount = available?.length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ambulance className="h-6 w-6 text-red-600" />
            <h1 className="font-bold text-lg">Ambulance Service</h1>
          </div>
          <Badge className="bg-green-100 text-green-700">{nearbyCount} available</Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* SOS Button */}
        <button
          onClick={handleSOS}
          disabled={createRequest.isPending || !!activeRequest}
          className="w-full py-5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white flex items-center justify-center gap-3 font-bold text-xl shadow-lg disabled:opacity-60"
        >
          <AlertTriangle className="h-7 w-7 animate-pulse" />
          SOS EMERGENCY
        </button>

        {/* Active Request Banner */}
        {activeRequest && (
          <Card className="border-blue-400 border-2 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Active Request</span>
                <Badge className={statusColor(activeRequest.status)}>{statusLabel(activeRequest.status)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span>{activeRequest.pickupAddress ?? "Your location"}</span>
              </div>
              {activeRequest.driver && (
                <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{activeRequest.driver.name}</p>
                    <p className="text-xs text-muted-foreground">{activeRequest.driver.vehicles?.[0]?.registrationNumber ?? "Ambulance"}</p>
                  </div>
                  <a href={`tel:${activeRequest.driver.phone}`} className="flex items-center gap-1 text-blue-600 text-sm">
                    <Phone className="h-4 w-4" /> Call Driver
                  </a>
                </div>
              )}
              {/* Live tracking map */}
              {activeRequest.driverLocation && (
                <AmbulanceMap
                  userLocation={userLocation}
                  driverLocation={activeRequest.driverLocation}
                  className="h-48 rounded-lg overflow-hidden"
                />
              )}
              {["pending", "accepted", "en_route"].includes(activeRequest.status) && (
                <Button size="sm" variant="outline" className="w-full border-red-300 text-red-600" onClick={handleCancel} disabled={cancelRequest.isPending}>
                  Cancel Request
                </Button>
              )}
              {activeRequest.status === "completed" && (
                <Button size="sm" className="w-full bg-yellow-500 hover:bg-yellow-600" onClick={() => setShowRatingForm(activeRequest.id)}>
                  <Star className="h-4 w-4 mr-1 fill-white" /> Rate This Trip
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rating Modal */}
        {showRatingForm && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Rate Your Trip</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRatingValue(n)} className="transition-transform hover:scale-110">
                    <Star className={`h-8 w-8 ${n <= ratingValue ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                  </button>
                ))}
              </div>
              <Textarea placeholder="Leave a review (optional)…" value={ratingReview} onChange={e => setRatingReview(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-yellow-500 hover:bg-yellow-600" onClick={handleRate} disabled={rateTrip.isPending}>Submit</Button>
                <Button size="sm" variant="outline" onClick={() => setShowRatingForm(null)}>Skip</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Form */}
        {!activeRequest && !showRequestForm && (
          <Button className="w-full" variant="outline" onClick={() => setShowRequestForm(true)}>
            <Ambulance className="h-4 w-4 mr-2" /> Book Ambulance
          </Button>
        )}

        {showRequestForm && !activeRequest && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Request Ambulance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Ambulance Type</Label>
                <Select value={form.vehicleType} onValueChange={v => setForm(f => ({ ...f, vehicleType: v as VehicleType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Pickup Address</Label>
                <Input placeholder="Enter pickup location" value={form.pickupAddress} onChange={e => setForm(f => ({ ...f, pickupAddress: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Drop Address (optional)</Label>
                <Input placeholder="Hospital / destination" value={form.dropAddress} onChange={e => setForm(f => ({ ...f, dropAddress: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Patient Name</Label>
                  <Input placeholder="Name" value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Condition</Label>
                  <Input placeholder="e.g. Chest pain" value={form.patientCondition} onChange={e => setForm(f => ({ ...f, patientCondition: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleRequest} disabled={createRequest.isPending}>
                  {createRequest.isPending ? "Sending…" : "Send Request"}
                </Button>
                <Button variant="outline" onClick={() => setShowRequestForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nearby Ambulances Map */}
        {userLocation && (available?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Nearby Ambulances</span>
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AmbulanceMap
                userLocation={userLocation}
                drivers={(available ?? []).map(d => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, vehicleType: d.vehicleType }))}
                className="h-56 rounded-b-lg overflow-hidden"
              />
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              {VEHICLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Driver Cards */}
        {loadingAvailable && <p className="text-center text-muted-foreground py-4">Finding nearby ambulances…</p>}
        {!loadingAvailable && available?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Ambulance className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>No ambulances available nearby.</p>
            <p className="text-xs mt-1">Try changing the filter or check back shortly.</p>
          </div>
        )}
        <div className="space-y-3">
          {available?.map((driver: any) => (
            <Card key={driver.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{driver.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{VEHICLE_TYPES.find(t => t.value === driver.vehicleType)?.icon} {VEHICLE_TYPES.find(t => t.value === driver.vehicleType)?.label ?? driver.vehicleType}</span>
                      {driver.distanceKm != null && (
                        <span className="flex items-center gap-0.5"><Navigation className="h-3 w-3" />{driver.distanceKm.toFixed(1)} km</span>
                      )}
                    </div>
                    {driver.avgRating && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span>{driver.avgRating.toFixed(1)} ({driver.ratingCount} ratings)</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge className="bg-green-100 text-green-700 text-xs">Available</Badge>
                    <div className="flex gap-1 mt-1">
                      <a href={`tel:${driver.phone}`}>
                        <Button size="sm" variant="outline" className="h-7 px-2"><Phone className="h-3 w-3" /></Button>
                      </a>
                      <Button size="sm" className="h-7 px-2 bg-red-600 hover:bg-red-700" onClick={() => {
                        setForm(f => ({ ...f, vehicleType: driver.vehicleType, driverId: driver.id }));
                        setShowRequestForm(true);
                      }}>Request</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
