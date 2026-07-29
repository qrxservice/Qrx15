/**
 * Ambulance Dispatch System — React Query hooks
 * Covers driver portal, user booking, admin command centre, live GPS.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getToken(): string {
  return localStorage.getItem("auth_token") ?? "";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AmbulanceDriver {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email: string;
  profilePhoto: string | null;
  dateOfBirth: string | null;
  address: string | null;
  nidNumber: string | null;
  nidPhoto: string | null;
  nidBackPhoto: string | null;
  selfiePhoto: string | null;
  licenceNumber: string | null;
  licencePhoto: string | null;
  licenceExpiry: string | null;
  division: string | null;
  district: string | null;
  upazila: string | null;
  serviceRadius: number | null;
  approvalStatus: "pending" | "approved" | "rejected" | "suspended";
  approvalNote: string | null;
  onlineStatus: "online" | "offline" | "busy";
  totalTrips: number;
  totalEarnings: number;
  avgRating: number | null;
  ratingCount: number;
  walletBalance: number;
  verificationStatus: string;
  gpsEnabled: boolean;
  lastActiveAt: string | null;
  commissionRate: number | null;
  vehicles?: AmbulanceVehicle[];
  location?: DriverLocation | null;
  createdAt: string;
}

export interface AmbulanceVehicle {
  id: number;
  driverId: number;
  vehicleType: VehicleType;
  registrationNumber: string;
  vehiclePhoto: string | null;
  make: string | null;
  model: string | null;
  year: string | null;
  seatingCapacity: number | null;
  isActive: boolean;
}

export type VehicleType = "basic" | "icu" | "ac" | "freezing" | "neonatal";
export const VEHICLE_TYPES: { value: VehicleType; label: string; icon: string }[] = [
  { value: "basic", label: "Basic Ambulance", icon: "🚑" },
  { value: "icu", label: "ICU Ambulance", icon: "🏥" },
  { value: "ac", label: "AC Ambulance", icon: "❄️" },
  { value: "freezing", label: "Freezing Ambulance", icon: "🧊" },
  { value: "neonatal", label: "Neonatal Ambulance", icon: "👶" },
];

export interface DriverLocation {
  id: number;
  driverId: number;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
}

export type RequestStatus =
  | "pending" | "accepted" | "en_route" | "arrived" | "in_progress" | "completed" | "cancelled";

export interface AmbulanceRequest {
  id: number;
  userId: number;
  driverId: number | null;
  vehicleId: number | null;
  status: RequestStatus;
  vehicleType: VehicleType;
  isSos: boolean;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string | null;
  dropLat: number | null;
  dropLng: number | null;
  dropAddress: string | null;
  patientName: string | null;
  patientCondition: string | null;
  notes: string | null;
  estimatedFare: number | null;
  actualFare: number | null;
  distanceKm: number | null;
  currency: string;
  cancellationReason: string | null;
  requestedAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  driver?: AmbulanceDriver | null;
  user?: { id: number; name: string | null; phone: string | null } | null;
  driverLocation?: DriverLocation | null;
}

export interface AmbulanceSettings {
  id: number;
  commissionEnabled: boolean;
  commissionRate: number;
  subscriptionEnabled: boolean;
  featuredListingEnabled: boolean;
  driverVerificationFeeEnabled: boolean;
  driverVerificationFeeAmount: number;
  baseFareBdt: number;
  perKmRateBdt: number;
  offlineTimeoutMinutes: number;
  requestTimeoutSeconds: number;
}

export interface AmbulanceStats {
  total: number;
  available: number;
  busy: number;
  offline: number;
  pendingApproval: number;
  suspended: number;
  activeTrips: number;
  sosPending: number;
}

export interface DriverStats {
  today: { trips: number; earnings: number };
  week: { trips: number; earnings: number };
  month: { trips: number; earnings: number };
  total: { trips: number; earnings: number };
  commission: { rate: number; amount: number };
  net: number;
  walletBalance: number;
}

export interface DriverRating {
  id: number;
  rating: number;
  review: string | null;
  createdAt: string;
  requestId: number;
  userName: string | null;
}

export interface DriverRatingsResponse {
  avgRating: number | null;
  ratingCount: number;
  ratings: DriverRating[];
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function useAmbulanceSettings() {
  return useQuery<AmbulanceSettings>({
    queryKey: ["ambulance-settings"],
    queryFn: () => apiFetch("/ambulance/settings"),
  });
}

export function useUpdateAmbulanceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AmbulanceSettings>) =>
      apiFetch<AmbulanceSettings>("/ambulance/settings", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambulance-settings"] }),
  });
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export function useDriverProfile() {
  return useQuery<AmbulanceDriver>({
    queryKey: ["ambulance-driver-me"],
    queryFn: () => apiFetch("/ambulance/drivers/me"),
    retry: false,
  });
}

export function useUpdateDriverProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AmbulanceDriver>) =>
      apiFetch<AmbulanceDriver>("/ambulance/drivers/me", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambulance-driver-me"] }),
  });
}

export function useRegisterDriver() {
  return useMutation({
    mutationFn: (data: Record<string, string | number>) =>
      apiFetch<{ driverId: number }>("/ambulance/drivers/register", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useSetDriverStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: "online" | "offline") =>
      apiFetch<{ onlineStatus: string }>("/ambulance/drivers/me/status", { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambulance-driver-me"] }),
  });
}

export function useUpdateDriverLocation() {
  return useMutation({
    mutationFn: (coords: { lat: number; lng: number; heading?: number; speed?: number }) =>
      apiFetch<DriverLocation>("/ambulance/drivers/me/location", { method: "PUT", body: JSON.stringify(coords) }),
  });
}

export function useDriverActiveRequest() {
  return useQuery<AmbulanceRequest | null>({
    queryKey: ["ambulance-driver-active"],
    queryFn: () => apiFetch("/ambulance/drivers/me/active-request"),
    refetchInterval: 8000,
  });
}

export function useDriverTrips(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const q = qs.toString();
  return useQuery<AmbulanceRequest[]>({
    queryKey: ["ambulance-driver-trips", params],
    queryFn: () => apiFetch(`/ambulance/drivers/me/trips${q ? `?${q}` : ""}`),
  });
}

export function useDriverStats() {
  return useQuery<DriverStats>({
    queryKey: ["ambulance-driver-stats"],
    queryFn: () => apiFetch("/ambulance/drivers/me/stats"),
    refetchInterval: 30000,
  });
}

export function useDriverRatings() {
  return useQuery<DriverRatingsResponse>({
    queryKey: ["ambulance-driver-ratings"],
    queryFn: () => apiFetch("/ambulance/drivers/me/ratings"),
  });
}

export function useAddVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AmbulanceVehicle> & { seatingCapacity?: number }) =>
      apiFetch<AmbulanceVehicle>("/ambulance/vehicles", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambulance-driver-me"] }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AmbulanceVehicle> }) =>
      apiFetch<AmbulanceVehicle>(`/ambulance/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambulance-driver-me"] }),
  });
}

// ─── User / Public ─────────────────────────────────────────────────────────────

/** Enriched driver returned by the /ambulance/available endpoint — includes flattened lat/lng */
export interface AvailableDriver {
  id: number;
  name: string;
  phone: string;
  profilePhoto: string | null;
  avgRating: number | null;
  ratingCount: number;
  totalTrips: number;
  vehicleType: VehicleType;
  registrationNumber: string | null;
  vehiclePhoto: string | null;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
}

export function useAvailableAmbulances(params?: { vehicleType?: string; lat?: number; lng?: number }) {
  const qs = new URLSearchParams();
  if (params?.vehicleType) qs.set("vehicleType", params.vehicleType);
  if (params?.lat != null) qs.set("lat", String(params.lat));
  if (params?.lng != null) qs.set("lng", String(params.lng));
  const q = qs.toString();
  return useQuery<AvailableDriver[]>({
    queryKey: ["ambulance-available", params],
    queryFn: () => apiFetch(`/ambulance/available${q ? `?${q}` : ""}`),
    refetchInterval: 15000,
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AmbulanceRequest> & { isSos?: boolean }) =>
      apiFetch<AmbulanceRequest>("/ambulance/requests", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulance-active-request"] });
      qc.invalidateQueries({ queryKey: ["ambulance-history"] });
    },
  });
}

export function useActiveRequest() {
  return useQuery<AmbulanceRequest | null>({
    queryKey: ["ambulance-active-request"],
    queryFn: () => apiFetch("/ambulance/requests/active"),
    refetchInterval: 8000,
  });
}

export function useRequestHistory() {
  return useQuery<AmbulanceRequest[]>({
    queryKey: ["ambulance-history"],
    queryFn: () => apiFetch("/ambulance/requests/history"),
  });
}

export function useAmbulanceRequest(id: number | null) {
  return useQuery<AmbulanceRequest>({
    queryKey: ["ambulance-request", id],
    queryFn: () => apiFetch(`/ambulance/requests/${id}`),
    enabled: id != null,
    refetchInterval: 6000,
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      apiFetch(`/ambulance/requests/${id}/cancel`, { method: "PUT", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulance-active-request"] });
      qc.invalidateQueries({ queryKey: ["ambulance-history"] });
    },
  });
}

export function useAcceptRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<AmbulanceRequest>(`/ambulance/requests/${id}/accept`, { method: "PUT", body: "{}" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulance-driver-active"] });
      qc.invalidateQueries({ queryKey: ["ambulance-driver-me"] });
    },
  });
}

export function useUpdateRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, actualFare, distanceKm }: { id: number; status: string; actualFare?: number; distanceKm?: number }) =>
      apiFetch<AmbulanceRequest>(`/ambulance/requests/${id}/status`, { method: "PUT", body: JSON.stringify({ status, actualFare, distanceKm }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulance-driver-active"] });
      qc.invalidateQueries({ queryKey: ["ambulance-driver-trips"] });
      qc.invalidateQueries({ queryKey: ["ambulance-driver-me"] });
      qc.invalidateQueries({ queryKey: ["ambulance-driver-stats"] });
    },
  });
}

export function useRateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating, review }: { id: number; rating: number; review?: string }) =>
      apiFetch(`/ambulance/requests/${id}/rate`, { method: "POST", body: JSON.stringify({ rating, review }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambulance-history"] }),
  });
}

// ─── Admin ─────────────────────────────────────────────────────────────────────

export function useAdminAmbulanceStats() {
  return useQuery<AmbulanceStats>({
    queryKey: ["admin-ambulance-stats"],
    queryFn: () => apiFetch("/admin/ambulance/stats"),
    refetchInterval: 15000,
  });
}

export function useAdminAmbulanceDrivers(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return useQuery<AmbulanceDriver[]>({
    queryKey: ["admin-ambulance-drivers", status],
    queryFn: () => apiFetch(`/admin/ambulance/drivers${qs}`),
  });
}

export function useApproveDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: "approved" | "rejected"; note?: string }) =>
      apiFetch(`/admin/ambulance/drivers/${id}/approve`, { method: "PUT", body: JSON.stringify({ status, note }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ambulance-drivers"] });
      qc.invalidateQueries({ queryKey: ["admin-ambulance-stats"] });
    },
  });
}

export function useSuspendDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      apiFetch(`/admin/ambulance/drivers/${id}/suspend`, { method: "PUT", body: JSON.stringify({ note }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ambulance-drivers"] });
      qc.invalidateQueries({ queryKey: ["admin-ambulance-stats"] });
    },
  });
}

export function useReactivateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/admin/ambulance/drivers/${id}/reactivate`, { method: "PUT", body: "{}" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ambulance-drivers"] });
      qc.invalidateQueries({ queryKey: ["admin-ambulance-stats"] });
    },
  });
}

export function useAdminAmbulanceRequests(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return useQuery<AmbulanceRequest[]>({
    queryKey: ["admin-ambulance-requests", status],
    queryFn: () => apiFetch(`/admin/ambulance/requests${qs}`),
    refetchInterval: 10000,
  });
}

export function useAdminAmbulanceMap() {
  return useQuery<{ drivers: any[]; activeRequests: AmbulanceRequest[] }>({
    queryKey: ["admin-ambulance-map"],
    queryFn: () => apiFetch("/admin/ambulance/map"),
    refetchInterval: 10000,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function statusLabel(s: RequestStatus): string {
  return {
    pending: "Pending",
    accepted: "Accepted",
    en_route: "On the Way",
    arrived: "Arrived",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  }[s] ?? s;
}

export function statusColor(s: RequestStatus): string {
  return {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    en_route: "bg-indigo-100 text-indigo-800",
    arrived: "bg-purple-100 text-purple-800",
    in_progress: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  }[s] ?? "bg-gray-100 text-gray-800";
}
