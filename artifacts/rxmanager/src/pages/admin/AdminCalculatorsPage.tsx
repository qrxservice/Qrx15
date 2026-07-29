import { useState, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator, Plus, Trash2, Pencil, X, ChevronUp, ChevronDown,
  FlaskConical, ListChecks, Settings2, Layers, HelpCircle, Search,
} from "lucide-react";
import {
  calculatorApi,
  type Calculator as Calc,
  type CalcField,
  type CalcFormula,
  type CalcResult,
  type CalcCondition,
  type CalcFaq,
  type Placement,
  type FieldType,
} from "@/lib/calculatorApi";

const CATEGORIES = ["general", "nutrition", "cardiology", "obstetrics", "pediatrics", "endocrinology", "nephrology", "pharmacy", "other"];
const PLACEMENTS: { key: Placement; label: string }[] = [
  { key: "public_tools", label: "Public Tools Page (/tools)" },
  { key: "main_menu", label: "Main Menu" },
  { key: "homepage_section", label: "Homepage Section" },
  { key: "patient_dashboard", label: "Patient Dashboard" },
  { key: "doctor_profile", label: "Doctor Profile Page" },
  { key: "appointment_page", label: "Appointment Page" },
  { key: "prescription_sidebar", label: "Prescription Page Sidebar" },
];
const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "text", label: "Text" },
  { value: "select", label: "Select Dropdown" },
  { value: "radio", label: "Radio Button" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
];
const CONDITION_OPS = [
  { value: "lt", label: "< Less than" },
  { value: "lte", label: "≤ Less than or equal" },
  { value: "gt", label: "> Greater than" },
  { value: "gte", label: "≥ Greater than or equal" },
  { value: "eq", label: "= Equal to" },
  { value: "gte_lt", label: "Range: ≥ value and < value2" },
  { value: "gte_lte", label: "Range: ≥ value and ≤ value2" },
];
const CONDITION_COLORS = ["green", "blue", "yellow", "orange", "red", "purple"];

type Tab = "basic" | "fields" | "formulas" | "results" | "placements" | "seo";

function uid() { return Math.random().toString(36).slice(2); }

const EMPTY_FORM = (): Partial<Calc> => ({
  title: "", slug: "", category: "general", shortDescription: "", content: "",
  featuredImageUrl: "", seoTitle: "", metaDescription: "", status: "draft",
  schemaEnabled: false,
  fieldsJson: [], formulasJson: [], resultsJson: [], faqsJson: [], placementsJson: [],
});

export default function AdminCalculatorsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const prefixId = useId();

  const { data: calcs } = useQuery({
    queryKey: ["admin-calculators"],
    queryFn: () => calculatorApi.list(true),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-calculators"] });

  const createMut = useMutation({ mutationFn: calculatorApi.create, onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Calc> }) => calculatorApi.update(id, data), onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: calculatorApi.remove, onSuccess: invalidate });
  const seedMut = useMutation({ mutationFn: calculatorApi.seedBmi, onSuccess: invalidate });

  const [editing, setEditing] = useState<Calc | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<Tab>("basic");
  const [form, setForm] = useState<Partial<Calc>>(EMPTY_FORM());

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM()); setTab("basic"); setShowForm(true); };
  const openEdit = (c: Calc) => { setEditing(c); setForm({ ...c }); setTab("basic"); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM()); };

  const setField = (k: keyof Calc, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // Fields
  const fields: CalcField[] = (form.fieldsJson ?? []) as CalcField[];
  const addField = () => setField("fieldsJson", [...fields, { id: uid(), name: "", label: "", type: "number", placeholder: "", unit: "", required: true, defaultValue: "", options: [], sortOrder: fields.length + 1 }]);
  const updateField = (idx: number, patch: Partial<CalcField>) => {
    const updated = fields.map((f, i) => i === idx ? { ...f, ...patch } : f);
    setField("fieldsJson", updated);
  };
  const removeField = (idx: number) => setField("fieldsJson", fields.filter((_, i) => i !== idx));
  const moveField = (idx: number, dir: -1 | 1) => {
    const arr = [...fields];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setField("fieldsJson", arr);
  };

  // Formulas
  const formulas: CalcFormula[] = (form.formulasJson ?? []) as CalcFormula[];
  const addFormula = () => setField("formulasJson", [...formulas, { id: uid(), name: "", expression: "", unit: "" }]);
  const updateFormula = (idx: number, patch: Partial<CalcFormula>) => setField("formulasJson", formulas.map((f, i) => i === idx ? { ...f, ...patch } : f));
  const removeFormula = (idx: number) => setField("formulasJson", formulas.filter((_, i) => i !== idx));

  // Results
  const results: CalcResult[] = (form.resultsJson ?? []) as CalcResult[];
  const addResult = () => setField("resultsJson", [...results, { id: uid(), title: "", formulaName: "", unit: "", category: "", suggestionText: "", conditions: [] }]);
  const updateResult = (idx: number, patch: Partial<CalcResult>) => setField("resultsJson", results.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const removeResult = (idx: number) => setField("resultsJson", results.filter((_, i) => i !== idx));
  const addCondition = (rIdx: number) => {
    const r = results[rIdx];
    updateResult(rIdx, { conditions: [...(r.conditions ?? []), { operator: "lt", value: 0, label: "", color: "green", message: "" }] });
  };
  const updateCondition = (rIdx: number, cIdx: number, patch: Partial<CalcCondition>) => {
    const r = results[rIdx];
    const conditions = r.conditions.map((c, i) => i === cIdx ? { ...c, ...patch } : c);
    updateResult(rIdx, { conditions });
  };
  const removeCondition = (rIdx: number, cIdx: number) => {
    const r = results[rIdx];
    updateResult(rIdx, { conditions: r.conditions.filter((_, i) => i !== cIdx) });
  };

  // FAQs
  const faqs: CalcFaq[] = (form.faqsJson ?? []) as CalcFaq[];
  const addFaq = () => setField("faqsJson", [...faqs, { question: "", answer: "" }]);
  const updateFaq = (idx: number, patch: Partial<CalcFaq>) => setField("faqsJson", faqs.map((f, i) => i === idx ? { ...f, ...patch } : f));
  const removeFaq = (idx: number) => setField("faqsJson", faqs.filter((_, i) => i !== idx));

  // Placements
  const placements: Placement[] = (form.placementsJson ?? []) as Placement[];
  const togglePlacement = (p: Placement) => {
    setField("placementsJson", placements.includes(p) ? placements.filter(x => x !== p) : [...placements, p]);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: form });
        toast({ title: "Calculator updated" });
      } else {
        await createMut.mutateAsync(form);
        toast({ title: "Calculator created" });
      }
      closeForm();
    } catch (e: unknown) {
      toast({ title: "Failed to save", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const handleDelete = async (c: Calc) => {
    if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    try { await deleteMut.mutateAsync(c.id); toast({ title: "Calculator deleted" }); }
    catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const handleSeedBmi = async () => {
    try { await seedMut.mutateAsync(); toast({ title: "BMI Calculator added" }); }
    catch (e: unknown) { toast({ title: e instanceof Error ? e.message : "Failed to seed", variant: "destructive" }); }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "basic", label: "Basic Info", icon: <Settings2 className="h-4 w-4" /> },
    { id: "fields", label: `Fields (${fields.length})`, icon: <Layers className="h-4 w-4" /> },
    { id: "formulas", label: `Formulas (${formulas.length})`, icon: <FlaskConical className="h-4 w-4" /> },
    { id: "results", label: `Results (${results.length})`, icon: <ListChecks className="h-4 w-4" /> },
    { id: "placements", label: "Placement", icon: <Search className="h-4 w-4" /> },
    { id: "seo", label: "SEO & FAQ", icon: <HelpCircle className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" />Calculator Builder</h1>
            <p className="text-muted-foreground text-sm mt-1">Create reusable health calculators without code changes.</p>
          </div>
          {!showForm && (
            <div className="flex gap-2">
              {(!calcs || calcs.every(c => c.slug !== "bmi-calculator")) && (
                <Button variant="outline" onClick={handleSeedBmi} disabled={seedMut.isPending}>Add Demo BMI</Button>
              )}
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />New Calculator</Button>
            </div>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                {editing ? `Edit: ${editing.title}` : "New Calculator"}
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="h-4 w-4" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tabs */}
              <div className="flex flex-wrap gap-1 border-b pb-2">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>

              {/* Basic Info */}
              {tab === "basic" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${prefixId}-title`}>Title *</Label>
                      <Input id={`${prefixId}-title`} value={form.title ?? ""} onChange={e => setField("title", e.target.value)} placeholder="BMI Calculator" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${prefixId}-slug`}>Slug <span className="text-xs text-muted-foreground">(auto-generated)</span></Label>
                      <Input id={`${prefixId}-slug`} value={form.slug ?? ""} onChange={e => setField("slug", e.target.value)} placeholder="bmi-calculator" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Select value={form.category ?? "general"} onValueChange={v => setField("category", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={form.status ?? "draft"} onValueChange={v => setField("status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Short Description</Label>
                    <Input value={form.shortDescription ?? ""} onChange={e => setField("shortDescription", e.target.value)} placeholder="One-line description shown on tools listing page" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Full Content / Instructions</Label>
                    <Textarea rows={5} value={form.content ?? ""} onChange={e => setField("content", e.target.value)} placeholder="Explain what this calculator does, how to use it, and interpret results." />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id={`${prefixId}-schema`} checked={!!form.schemaEnabled} onCheckedChange={v => setField("schemaEnabled", !!v)} />
                    <Label htmlFor={`${prefixId}-schema`} className="cursor-pointer">Enable structured schema markup (for SEO)</Label>
                  </div>
                </div>
              )}

              {/* Input Fields Builder */}
              {tab === "fields" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Define the input fields users fill to get a result.</p>
                    <Button size="sm" variant="outline" onClick={addField}><Plus className="h-3.5 w-3.5 mr-1" />Add Field</Button>
                  </div>
                  {fields.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">No fields yet. Add your first input field.</p>}
                  {fields.map((f, idx) => (
                    <Card key={f.id} className="border-dashed">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Field {idx + 1}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveField(idx, -1)} disabled={idx === 0}><ChevronUp className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}><ChevronDown className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeField(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Field Name (for formula)</Label>
                            <Input className="h-8 text-sm" value={f.name} onChange={e => updateField(idx, { name: e.target.value })} placeholder="weight" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Label (shown to user)</Label>
                            <Input className="h-8 text-sm" value={f.label} onChange={e => updateField(idx, { label: e.target.value })} placeholder="Weight" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select value={f.type} onValueChange={v => updateField(idx, { type: v as FieldType })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Placeholder</Label>
                            <Input className="h-8 text-sm" value={f.placeholder ?? ""} onChange={e => updateField(idx, { placeholder: e.target.value })} placeholder="e.g. 70" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unit</Label>
                            <Input className="h-8 text-sm" value={f.unit ?? ""} onChange={e => updateField(idx, { unit: e.target.value })} placeholder="kg" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Default value</Label>
                            <Input className="h-8 text-sm" value={f.defaultValue ?? ""} onChange={e => updateField(idx, { defaultValue: e.target.value })} placeholder="" />
                          </div>
                        </div>
                        {(f.type === "select" || f.type === "radio") && (
                          <div className="space-y-1">
                            <Label className="text-xs">Options <span className="text-muted-foreground">(comma-separated)</span></Label>
                            <Input className="h-8 text-sm" value={(f.options ?? []).join(", ")} onChange={e => updateField(idx, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="Option 1, Option 2, Option 3" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Checkbox id={`${prefixId}-req-${idx}`} checked={!!f.required} onCheckedChange={v => updateField(idx, { required: !!v })} />
                          <Label htmlFor={`${prefixId}-req-${idx}`} className="text-xs cursor-pointer">Required field</Label>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Formula Builder */}
              {tab === "formulas" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Define formulas using input field names from the Fields tab.</p>
                    <Button size="sm" variant="outline" onClick={addFormula}><Plus className="h-3.5 w-3.5 mr-1" />Add Formula</Button>
                  </div>
                  {fields.length > 0 && (
                    <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
                      <strong>Available field names:</strong> {fields.map(f => f.name).filter(Boolean).join(", ")}
                    </div>
                  )}
                  {formulas.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">No formulas yet. Add your calculation formula.</p>}
                  {formulas.map((f, idx) => (
                    <Card key={f.id} className="border-dashed">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Formula {idx + 1}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFormula(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Formula name (used in Results)</Label>
                            <Input className="h-8 text-sm" value={f.name} onChange={e => updateFormula(idx, { name: e.target.value })} placeholder="bmi" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Result unit</Label>
                            <Input className="h-8 text-sm" value={f.unit ?? ""} onChange={e => updateFormula(idx, { unit: e.target.value })} placeholder="kg/m²" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Expression</Label>
                          <Input className="h-8 text-sm font-mono" value={f.expression} onChange={e => updateFormula(idx, { expression: e.target.value })} placeholder="weight / ((height / 100) * (height / 100))" />
                          <p className="text-xs text-muted-foreground">Use +, -, *, /, (, ) and Math functions (Math.sqrt, Math.pow, etc.)</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Result Builder */}
              {tab === "results" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Define what to show after calculation, including conditional messages.</p>
                    <Button size="sm" variant="outline" onClick={addResult}><Plus className="h-3.5 w-3.5 mr-1" />Add Result</Button>
                  </div>
                  {results.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">No results yet. Add a result block.</p>}
                  {results.map((r, rIdx) => (
                    <Card key={r.id} className="border-dashed">
                      <CardContent className="pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result {rIdx + 1}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeResult(rIdx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Result title</Label>
                            <Input className="h-8 text-sm" value={r.title} onChange={e => updateResult(rIdx, { title: e.target.value })} placeholder="Your BMI" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Formula name</Label>
                            <Select value={r.formulaName} onValueChange={v => updateResult(rIdx, { formulaName: v })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select formula" /></SelectTrigger>
                              <SelectContent>
                                {formulas.filter(f => f.name).map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Unit</Label>
                            <Input className="h-8 text-sm" value={r.unit ?? ""} onChange={e => updateResult(rIdx, { unit: e.target.value })} placeholder="kg/m²" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Category label</Label>
                            <Input className="h-8 text-sm" value={r.category ?? ""} onChange={e => updateResult(rIdx, { category: e.target.value })} placeholder="BMI Score" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Suggestion text</Label>
                          <Input className="h-8 text-sm" value={r.suggestionText ?? ""} onChange={e => updateResult(rIdx, { suggestionText: e.target.value })} placeholder="Consult your doctor if outside healthy range." />
                        </div>

                        {/* Conditions */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Conditional Messages</Label>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addCondition(rIdx)}><Plus className="h-3 w-3 mr-1" />Add Condition</Button>
                          </div>
                          {(r.conditions ?? []).map((c, cIdx) => (
                            <div key={cIdx} className="border rounded-md p-3 space-y-2 bg-muted/30">
                              <div className="grid gap-2 sm:grid-cols-4">
                                <div className="space-y-1">
                                  <Label className="text-xs">Operator</Label>
                                  <Select value={c.operator} onValueChange={v => updateCondition(rIdx, cIdx, { operator: v as CalcCondition["operator"] })}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>{CONDITION_OPS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Value</Label>
                                  <Input className="h-7 text-xs" type="number" value={c.value} onChange={e => updateCondition(rIdx, cIdx, { value: parseFloat(e.target.value) || 0 })} />
                                </div>
                                {(c.operator === "gte_lt" || c.operator === "gte_lte") && (
                                  <div className="space-y-1">
                                    <Label className="text-xs">Value 2</Label>
                                    <Input className="h-7 text-xs" type="number" value={c.value2 ?? ""} onChange={e => updateCondition(rIdx, cIdx, { value2: parseFloat(e.target.value) || 0 })} />
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <Label className="text-xs">Color</Label>
                                  <Select value={c.color ?? "green"} onValueChange={v => updateCondition(rIdx, cIdx, { color: v })}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>{CONDITION_COLORS.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Label</Label>
                                  <Input className="h-7 text-xs" value={c.label} onChange={e => updateCondition(rIdx, cIdx, { label: e.target.value })} placeholder="Normal weight" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Message</Label>
                                  <Input className="h-7 text-xs" value={c.message ?? ""} onChange={e => updateCondition(rIdx, cIdx, { message: e.target.value })} placeholder="Your weight is in the healthy range." />
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => removeCondition(rIdx, cIdx)}><Trash2 className="h-3 w-3 mr-1" />Remove</Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Placement */}
              {tab === "placements" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Choose where this calculator appears in the platform.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PLACEMENTS.map(p => (
                      <div key={p.key} className="flex items-center gap-2 p-3 border rounded-md">
                        <Checkbox id={`${prefixId}-${p.key}`} checked={placements.includes(p.key)} onCheckedChange={() => togglePlacement(p.key)} />
                        <Label htmlFor={`${prefixId}-${p.key}`} className="cursor-pointer text-sm">{p.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO & FAQ */}
              {tab === "seo" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>SEO Title <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Input value={form.seoTitle ?? ""} onChange={e => setField("seoTitle", e.target.value)} placeholder="BMI Calculator - Check Your Body Mass Index" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Meta Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Textarea rows={2} value={form.metaDescription ?? ""} onChange={e => setField("metaDescription", e.target.value)} placeholder="Calculate your BMI instantly. Find out if you're underweight, normal, overweight, or obese." />
                  </div>
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">FAQ Section</Label>
                      <Button size="sm" variant="outline" onClick={addFaq}><Plus className="h-3.5 w-3.5 mr-1" />Add FAQ</Button>
                    </div>
                    {faqs.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center border rounded-md">No FAQs yet.</p>}
                    {faqs.map((faq, idx) => (
                      <div key={idx} className="border rounded-md p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <Input className="h-8 text-sm" value={faq.question} onChange={e => updateFaq(idx, { question: e.target.value })} placeholder="What is BMI?" />
                            <Textarea rows={2} className="text-sm" value={faq.answer} onChange={e => updateFaq(idx, { answer: e.target.value })} placeholder="BMI stands for Body Mass Index..." />
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0 mt-0.5" onClick={() => removeFaq(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={handleSave} disabled={isSaving}>{editing ? "Update Calculator" : "Create Calculator"}</Button>
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calculator List */}
        <Card>
          <CardHeader><CardTitle className="text-base">All Calculators</CardTitle></CardHeader>
          <CardContent>
            {!calcs || calcs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No calculators yet. Click "New Calculator" or "Add Demo BMI" to get started.</p>
            ) : (
              <div className="divide-y">
                {calcs.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                      <Calculator className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">/tools/{c.slug} · {c.category} · {(c.fieldsJson as CalcField[]).length} fields</p>
                    </div>
                    <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
