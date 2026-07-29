/**
 * AmbulanceMap — Leaflet.js + OpenStreetMap
 * Lazy-loads leaflet only when rendered to keep the main bundle small.
 */
import { useEffect, useRef } from "react";
import type { DriverLocation } from "@/lib/ambulance-api";

interface Props {
  userLocation?: { lat: number; lng: number } | null;
  driverLocation?: DriverLocation | null;
  drivers?: Array<{ id: number; name: string; lat: number | null; lng: number | null; vehicleType?: string }>;
  className?: string;
}

export default function AmbulanceMap({ userLocation, driverLocation, drivers, className = "h-64" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    (async () => {
      // Dynamic import so leaflet CSS is only loaded when the map is used
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current) return;

      // Fix default marker icons (webpack/vite asset path issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : driverLocation
        ? [driverLocation.lat, driverLocation.lng]
        : [23.8103, 90.4125]; // Dhaka default

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView(center, 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(mapRef.current);
      }

      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // User marker
      if (userLocation) {
        const userIcon = L.divIcon({
          html: `<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        markersRef.current.push(
          L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
            .addTo(mapRef.current)
            .bindPopup("📍 Your Location"),
        );
      }

      // Single driver tracking
      if (driverLocation) {
        const driverIcon = L.divIcon({
          html: `<div style="font-size:26px;line-height:1">🚑</div>`,
          className: "",
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        markersRef.current.push(
          L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
            .addTo(mapRef.current)
            .bindPopup("🚑 Driver"),
        );
        mapRef.current.setView([driverLocation.lat, driverLocation.lng], 14);
      }

      // Multiple available drivers
      if (drivers) {
        const ambulanceIcon = L.divIcon({
          html: `<div style="font-size:22px;line-height:1">🚑</div>`,
          className: "",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        for (const d of drivers) {
          if (d.lat == null || d.lng == null) continue;
          markersRef.current.push(
            L.marker([d.lat, d.lng], { icon: ambulanceIcon })
              .addTo(mapRef.current)
              .bindPopup(`🚑 ${d.name}`),
          );
        }
      }

      // Fit bounds if multiple points
      const points: [number, number][] = [];
      if (userLocation) points.push([userLocation.lat, userLocation.lng]);
      if (driverLocation) points.push([driverLocation.lat, driverLocation.lng]);
      drivers?.forEach(d => d.lat != null && d.lng != null && points.push([d.lat!, d.lng!]));
      if (points.length > 1) {
        mapRef.current.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userLocation?.lat, userLocation?.lng, driverLocation?.lat, driverLocation?.lng, drivers?.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className={className} style={{ zIndex: 0 }} />;
}
