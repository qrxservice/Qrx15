/**
 * QRX Tools API — custom React Query hooks.
 * Uses direct fetch (same pattern as the generated API client) so no codegen is needed.
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

// ---- Types ----

export interface ToolCategory {
  id: number;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Tool {
  id: number;
  name: string;
  slug: string;
  type: string;
  categoryId: number | null;
  categoryName: string | null;
  department: string;
  shortDescription: string | null;
  featuredImageUrl: string | null;
  icon: string | null;
  status: "draft" | "published";
  version: string;
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminToolsResponse {
  tools: Tool[];
  total: number;
}

export interface AdminToolsParams {
  search?: string;
  category?: string;
  department?: string;
  status?: string;
  type?: string;
}

// ---- Categories ----

export function useToolCategories() {
  return useQuery<ToolCategory[]>({
    queryKey: ["tool-categories"],
    queryFn: () => apiFetch("/tool-categories"),
  });
}

export function useCreateToolCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string }) =>
      apiFetch<ToolCategory>("/admin/tool-categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tool-categories"] }),
  });
}

export function useDeleteToolCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/tool-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tool-categories"] }),
  });
}

// ---- Admin Tools ----

export function useAdminTools(params?: AdminToolsParams) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.category) qs.set("category", params.category);
  if (params?.department) qs.set("department", params.department);
  if (params?.status) qs.set("status", params.status);
  if (params?.type) qs.set("type", params.type);
  const q = qs.toString();
  return useQuery<AdminToolsResponse>({
    queryKey: ["admin-tools", params],
    queryFn: () => apiFetch(`/admin/tools${q ? `?${q}` : ""}`),
  });
}

export function useCreateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Tool>) =>
      apiFetch<Tool>("/admin/tools", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tools"] }),
  });
}

export function useUpdateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Tool> }) =>
      apiFetch<Tool>(`/admin/tools/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tools"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
    },
  });
}

export function useDeleteTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/tools/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tools"] }),
  });
}

export function useDuplicateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<Tool>(`/admin/tools/${id}/duplicate`, { method: "POST", body: "{}" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tools"] }),
  });
}

export function usePublishTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<Tool>(`/admin/tools/${id}/publish`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tools"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
    },
  });
}

export function useImportTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pkg: Record<string, unknown>) =>
      apiFetch<Tool>("/admin/tools/import", { method: "POST", body: JSON.stringify(pkg) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tools"] }),
  });
}

// ---- Doctor / Public Tools ----

export function usePublicTools(params?: { search?: string; category?: string; department?: string }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.category) qs.set("category", params.category);
  if (params?.department) qs.set("department", params.department);
  const q = qs.toString();
  return useQuery<Tool[]>({
    queryKey: ["tools", params],
    queryFn: () => apiFetch(`/tools${q ? `?${q}` : ""}`),
  });
}

export function useTool(slug: string) {
  return useQuery<Tool>({
    queryKey: ["tool", slug],
    queryFn: () => apiFetch(`/tools/${slug}`),
    enabled: !!slug,
  });
}

export function useDoctorFavorites() {
  return useQuery<Tool[]>({
    queryKey: ["doctor-tool-favorites"],
    queryFn: () => apiFetch("/doctor/tools/favorites"),
  });
}

export function useDoctorRecentTools() {
  return useQuery<Tool[]>({
    queryKey: ["doctor-tool-recent"],
    queryFn: () => apiFetch("/doctor/tools/recent"),
  });
}

export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/tools/${id}/favorite`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-tool-favorites"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
    },
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/tools/${id}/favorite`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-tool-favorites"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
    },
  });
}

export function useRecordToolUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/tools/${id}/use`, { method: "POST", body: "{}" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-tool-recent"] }),
  });
}
