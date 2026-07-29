/**
 * Emergency Contact Directory API — custom React Query hooks.
 * Uses direct fetch (same pattern as tools-api.ts) so no codegen is needed.
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

export const EMERGENCY_CATEGORIES = [
  { value: "ambulance", label: "Ambulance" },
  { value: "oxygen", label: "Oxygen Supply" },
  { value: "blood_donor", label: "Blood Donor" },
  { value: "emergency_doctor", label: "Emergency Doctor" },
  { value: "diagnostic_support", label: "Diagnostic Support" },
  { value: "hospital_contact", label: "Hospital Contact" },
] as const;

export type EmergencyCategory = typeof EMERGENCY_CATEGORIES[number]["value"];

export interface EmergencyContact {
  id: number;
  category: string;
  name: string;
  mobileNumber: string;
  driverName: string | null;
  vehicleNumber: string | null;
  country: string;
  division: string | null;
  district: string | null;
  upazila: string | null;
  area: string | null;
  notes: string | null;
  availabilityStatus: "available" | "busy" | "offline";
  isVerified: boolean;
  isPriority: boolean;
  isActive: boolean;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicEmergencyFilters {
  category?: string;
  country?: string;
  division?: string;
  district?: string;
  upazila?: string;
  area?: string;
}

// ---- Public ----

export function usePublicEmergencyContacts(filters?: PublicEmergencyFilters) {
  const qs = new URLSearchParams();
  if (filters?.category) qs.set("category", filters.category);
  if (filters?.country) qs.set("country", filters.country);
  if (filters?.division) qs.set("division", filters.division);
  if (filters?.district) qs.set("district", filters.district);
  if (filters?.upazila) qs.set("upazila", filters.upazila);
  if (filters?.area) qs.set("area", filters.area);
  const q = qs.toString();
  return useQuery<EmergencyContact[]>({
    queryKey: ["emergency-contacts", filters],
    queryFn: () => apiFetch(`/emergency-contacts${q ? `?${q}` : ""}`),
  });
}

export function useReportEmergencyContact() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      apiFetch(`/emergency-contacts/${id}/report`, { method: "POST", body: JSON.stringify({ reason }) }),
  });
}

// ---- Admin ----

export function useAdminEmergencyContacts() {
  return useQuery<EmergencyContact[]>({
    queryKey: ["admin-emergency-contacts"],
    queryFn: () => apiFetch("/admin/emergency-contacts"),
  });
}

export function useCreateEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EmergencyContact>) =>
      apiFetch<EmergencyContact>("/admin/emergency-contacts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-emergency-contacts"] });
      qc.invalidateQueries({ queryKey: ["emergency-contacts"] });
    },
  });
}

export function useUpdateEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EmergencyContact> }) =>
      apiFetch<EmergencyContact>(`/admin/emergency-contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-emergency-contacts"] });
      qc.invalidateQueries({ queryKey: ["emergency-contacts"] });
    },
  });
}

export function useDeleteEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/emergency-contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-emergency-contacts"] });
      qc.invalidateQueries({ queryKey: ["emergency-contacts"] });
    },
  });
}

export function useToggleVerifyEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<EmergencyContact>(`/admin/emergency-contacts/${id}/verify`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-emergency-contacts"] });
      qc.invalidateQueries({ queryKey: ["emergency-contacts"] });
    },
  });
}

export function categoryLabel(value: string): string {
  return EMERGENCY_CATEGORIES.find(c => c.value === value)?.label ?? value;
}
