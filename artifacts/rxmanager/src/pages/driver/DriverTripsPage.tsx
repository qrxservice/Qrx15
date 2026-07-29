import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDriverTrips, statusLabel, statusColor } from "@/lib/ambulance-api";
import { MapPin, Clock, Ambulance, Filter, X, TrendingUp } from "lucide-react";
import { DriverLayout } from "@/components/layout/DriverLayout";

type Preset = "today" | "week" | "month" | "custom" | "all";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: Preset): { from?: string; to?: string } {
  const now = new Date();
  if (preset === "today") {
    return { from: toISODate(now), to: toISODate(now) };
  }
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return { from: toISODate(start), to: toISODate(now) };
  }
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toISODate(start), to: toISODate(now) };
  }
  return {};
}

export default function DriverTripsPage() {
  const [activePreset, setActivePreset] = useState<Preset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const range = activePreset === "custom"
    ? { from: customFrom || undefined, to: customTo || undefined }
    : presetRange(activePreset);

  const { data: trips, isLoading } = useDriverTrips(
    activePreset === "all" ? undefined : range,
  );

  const totalFare = trips?.reduce((s, t) => s + (t.actualFare ?? 0), 0) ?? 0;
  const totalKm = trips?.reduce((s, t) => s + (t.distanceKm ?? 0), 0) ?? 0;

  const PRESETS: { key: Preset; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl">Trip History</h1>
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map(p => (
            <Button
              key={p.key}
              size="sm"
              variant={activePreset === p.key ? "default" : "outline"}
              className={`h-7 text-xs px-3 ${activePreset === p.key ? "bg-red-600 hover:bg-red-700" : ""}`}
              onClick={() => {
                setActivePreset(p.key);
                setShowCustom(p.key === "custom");
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Custom date picker */}
        {showCustom && (
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary row */}
        {trips && trips.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-blue-700">{trips.length}</p>
              <p className="text-xs text-muted-foreground">Trips</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-green-700">৳{totalFare.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Earned</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-purple-700">{totalKm.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">km</p>
            </div>
          </div>
        )}

        {/* Trips list */}
        <div className="space-y-3">
          {isLoading && <p className="text-center text-muted-foreground py-8">Loading…</p>}
          {!isLoading && (!trips || trips.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Ambulance className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>No trips found{activePreset !== "all" ? " for this period" : ""}.</p>
              {activePreset !== "all" && (
                <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs" onClick={() => { setActivePreset("all"); setShowCustom(false); }}>
                  <X className="h-3 w-3" /> Clear filter
                </Button>
              )}
            </div>
          )}
          {trips?.map(trip => (
            <Card key={trip.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Trip #{trip.id}</span>
                    {trip.isSos && <Badge className="bg-red-100 text-red-700 text-xs">SOS</Badge>}
                  </div>
                  <Badge className={statusColor(trip.status)}>{statusLabel(trip.status)}</Badge>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                  <span className="line-clamp-1">{trip.pickupAddress ?? `${trip.pickupLat.toFixed(4)}, ${trip.pickupLng.toFixed(4)}`}</span>
                </div>
                {trip.dropAddress && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" />
                    <span className="line-clamp-1">{trip.dropAddress}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(trip.completedAt ?? trip.requestedAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {trip.actualFare != null && (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />৳{trip.actualFare.toLocaleString()}
                    </span>
                  )}
                  {trip.distanceKm != null && <span>{trip.distanceKm.toFixed(1)} km</span>}
                  <span className="capitalize">{trip.vehicleType}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DriverLayout>
  );
}
