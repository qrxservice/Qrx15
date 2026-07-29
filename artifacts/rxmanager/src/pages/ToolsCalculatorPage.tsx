import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { calculatorApi, type CalcField, type CalcFormula, type CalcResult, type CalcCondition, type CalcFaq } from "@/lib/calculatorApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { storageUrl } from "@/lib/storage";

const COLOR_MAP: Record<string, string> = {
  green: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
  blue: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200",
  orange: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-200",
  red: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
  purple: "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-200",
};

function evaluateFormula(expression: string, values: Record<string, number>): number | null {
  try {
    const keys = Object.keys(values);
    const vals = Object.values(values);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return (${expression});`);
    const result = fn(...vals);
    if (typeof result !== "number" || !isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

function matchCondition(value: number, cond: CalcCondition): boolean {
  switch (cond.operator) {
    case "lt": return value < cond.value;
    case "lte": return value <= cond.value;
    case "gt": return value > cond.value;
    case "gte": return value >= cond.value;
    case "eq": return value === cond.value;
    case "gte_lt": return value >= cond.value && value < (cond.value2 ?? Infinity);
    case "gte_lte": return value >= cond.value && value <= (cond.value2 ?? Infinity);
    default: return false;
  }
}

function FaqItem({ faq }: { faq: CalcFaq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-medium text-sm pr-4">{faq.question}</span>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.answer}</div>}
    </div>
  );
}

export default function ToolsCalculatorPage() {
  const [, params] = useRoute("/tools/:slug");
  const slug = params?.slug ?? "";

  const { data: calc, isLoading, isError } = useQuery({
    queryKey: ["public-calculator", slug],
    queryFn: () => calculatorApi.getBySlug(slug),
    enabled: !!slug,
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [calculated, setCalculated] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto mb-4" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse mx-auto" />
      </div>
    );
  }

  if (isError || !calc) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-xl font-bold mb-2">Calculator Not Found</h1>
        <p className="text-muted-foreground mb-6">This calculator doesn't exist or hasn't been published yet.</p>
        <Link href="/tools"><Button>Browse All Calculators</Button></Link>
      </div>
    );
  }

  const fields = calc.fieldsJson as CalcField[];
  const formulas = calc.formulasJson as CalcFormula[];
  const results = calc.resultsJson as CalcResult[];
  const faqs = calc.faqsJson as CalcFaq[];

  const numericValues: Record<string, number> = {};
  for (const f of fields) {
    const raw = values[f.name] ?? f.defaultValue ?? "";
    const n = parseFloat(raw);
    if (!isNaN(n)) numericValues[f.name] = n;
  }

  const computedFormulas: Record<string, number | null> = {};
  for (const formula of formulas) {
    computedFormulas[formula.name] = evaluateFormula(formula.expression, numericValues);
  }

  const allFilled = fields.filter(f => f.required).every(f => {
    const v = values[f.name] ?? f.defaultValue ?? "";
    return v.trim() !== "" && !isNaN(parseFloat(v));
  });

  const handleCalculate = () => {
    if (!allFilled) return;
    setCalculated(true);
  };

  const handleReset = () => {
    setValues({});
    setCalculated(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/tools" className="hover:text-foreground transition-colors">Tools</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate">{calc.title}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          {storageUrl(calc.featuredImageUrl) ? (
            <img src={storageUrl(calc.featuredImageUrl)} alt={calc.title} className="w-16 h-16 rounded-xl object-cover border shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calculator className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{calc.title}</h1>
              <Badge variant="secondary" className="capitalize">{calc.category}</Badge>
            </div>
            {calc.shortDescription && (
              <p className="text-muted-foreground mt-1">{calc.shortDescription}</p>
            )}
          </div>
        </div>

        {/* Calculator Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Enter Values
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map(f => (
              <div key={f.id} className="space-y-1.5">
                <Label>
                  {f.label}
                  {f.unit && <span className="text-muted-foreground text-xs ml-1">({f.unit})</span>}
                  {f.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {f.type === "select" ? (
                  <Select value={values[f.name] ?? f.defaultValue ?? ""} onValueChange={v => setValues(prev => ({ ...prev, [f.name]: v }))}>
                    <SelectTrigger><SelectValue placeholder={f.placeholder || "Select an option"} /></SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.type === "radio" ? (
                  <div className="flex flex-wrap gap-2">
                    {(f.options ?? []).map(opt => (
                      <button
                        key={opt}
                        onClick={() => setValues(prev => ({ ...prev, [f.name]: opt }))}
                        className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                          (values[f.name] ?? f.defaultValue) === opt
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:border-primary/50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    placeholder={f.placeholder}
                    value={values[f.name] ?? f.defaultValue ?? ""}
                    onChange={e => {
                      setValues(prev => ({ ...prev, [f.name]: e.target.value }));
                      setCalculated(false);
                    }}
                  />
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCalculate} disabled={!allFilled} className="flex-1 sm:flex-none">
                Calculate
              </Button>
              {calculated && (
                <Button variant="outline" onClick={handleReset}>Reset</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {calculated && (
          <div className="space-y-4">
            {results.map(result => {
              const val = computedFormulas[result.formulaName];
              const matchedCond = val !== null
                ? (result.conditions ?? []).find(c => matchCondition(val, c))
                : null;
              const colorClass = matchedCond?.color ? (COLOR_MAP[matchedCond.color] ?? COLOR_MAP.blue) : COLOR_MAP.blue;

              return (
                <Card key={result.id} className={`border-2 ${matchedCond?.color === "green" ? "border-green-200 dark:border-green-800" : matchedCond?.color === "red" ? "border-red-200 dark:border-red-800" : matchedCond?.color === "yellow" ? "border-yellow-200 dark:border-yellow-800" : "border-primary/20"}`}>
                  <CardContent className="pt-6 space-y-4">
                    {/* Score */}
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">{result.title}</p>
                      {val !== null ? (
                        <p className="text-5xl font-bold text-primary">{val}</p>
                      ) : (
                        <p className="text-muted-foreground">Could not calculate — check your inputs.</p>
                      )}
                      {result.unit && <p className="text-sm text-muted-foreground mt-1">{result.unit}</p>}
                    </div>

                    {/* Category badge */}
                    {matchedCond && (
                      <div className={`rounded-lg border p-4 text-center ${colorClass}`}>
                        <p className="font-semibold text-lg">{matchedCond.label}</p>
                        {matchedCond.message && <p className="text-sm mt-1 opacity-90">{matchedCond.message}</p>}
                      </div>
                    )}

                    {/* Suggestion */}
                    {result.suggestionText && (
                      <p className="text-sm text-muted-foreground text-center italic">{result.suggestionText}</p>
                    )}

                    {/* All categories reference */}
                    {result.conditions && result.conditions.length > 0 && (
                      <div className="border-t pt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Reference ranges</p>
                        <div className="flex flex-wrap gap-2">
                          {result.conditions.map((c, i) => (
                            <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${COLOR_MAP[c.color ?? "blue"] ?? ""} ${matchedCond === c ? "ring-2 ring-offset-1 ring-current" : "opacity-60"}`}>
                              {c.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Description */}
        {calc.content && (
          <Card>
            <CardHeader><CardTitle className="text-base">About This Calculator</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{calc.content}</p>
            </CardContent>
          </Card>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
            {faqs.map((faq, i) => <FaqItem key={i} faq={faq} />)}
          </div>
        )}

        {/* Back link */}
        <div className="pt-2">
          <Link href="/tools">
            <Button variant="ghost" size="sm" className="text-muted-foreground">← Back to all calculators</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
