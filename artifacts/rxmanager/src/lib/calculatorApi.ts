const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type FieldType = "text" | "number" | "select" | "radio" | "checkbox" | "date";

export interface CalcField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  unit?: string;
  required?: boolean;
  defaultValue?: string;
  options?: string[];
  sortOrder?: number;
}

export interface CalcFormula {
  id: string;
  name: string;
  expression: string;
  unit?: string;
}

export interface CalcCondition {
  operator: "lt" | "lte" | "gt" | "gte" | "eq" | "gte_lt" | "gte_lte";
  value: number;
  value2?: number;
  label: string;
  color?: string;
  message?: string;
}

export interface CalcResult {
  id: string;
  title: string;
  formulaName: string;
  unit?: string;
  category?: string;
  suggestionText?: string;
  conditions: CalcCondition[];
}

export interface CalcFaq {
  question: string;
  answer: string;
}

export type Placement =
  | "public_tools"
  | "patient_dashboard"
  | "doctor_profile"
  | "appointment_page"
  | "prescription_sidebar"
  | "main_menu"
  | "homepage_section";

export interface Calculator {
  id: number;
  title: string;
  slug: string;
  category: string;
  shortDescription: string | null;
  content: string;
  featuredImageUrl: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  status: string;
  schemaEnabled: boolean;
  fieldsJson: CalcField[];
  formulasJson: CalcFormula[];
  resultsJson: CalcResult[];
  faqsJson: CalcFaq[];
  placementsJson: Placement[];
  createdAt: string;
  updatedAt: string;
}

export type CalcBody = Omit<Calculator, "id" | "createdAt" | "updatedAt">;

export const calculatorApi = {
  list: (all = false) => apiFetch<Calculator[]>(`/api/calculators${all ? "?all=true" : ""}`),
  getBySlug: (slug: string) => apiFetch<Calculator>(`/api/calculators/slug/${slug}`),
  getById: (id: number) => apiFetch<Calculator>(`/api/calculators/${id}`),
  create: (data: Partial<CalcBody>) => apiFetch<Calculator>("/api/calculators", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CalcBody>) => apiFetch<Calculator>(`/api/calculators/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => apiFetch<void>(`/api/calculators/${id}`, { method: "DELETE" }),
  seedBmi: () => apiFetch<Calculator>("/api/calculators/seed/bmi", { method: "POST" }),
};
