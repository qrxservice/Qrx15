import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { calculatorApi, type Calculator as CalcType } from "@/lib/calculatorApi";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Search } from "lucide-react";
import { useState } from "react";
import { storageUrl } from "@/lib/storage";

export default function ToolsPage() {
  const { data: calcs, isLoading } = useQuery({
    queryKey: ["public-calculators"],
    queryFn: () => calculatorApi.list(false),
  });

  const [search, setSearch] = useState("");

  const filtered = (calcs ?? []).filter(c =>
    !search ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase()) ||
    (c.shortDescription ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set((calcs ?? []).map(c => c.category)));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Calculator className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Medical Calculators</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Free, evidence-based health calculators for patients and clinicians.
          </p>
          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search calculators…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{search ? "No calculators match your search." : "No calculators published yet."}</p>
          </div>
        )}

        {!isLoading && !search && categories.map(cat => {
          const items = filtered.filter(c => c.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </h2>
              <CalculatorGrid items={items} />
            </div>
          );
        })}

        {!isLoading && search && <CalculatorGrid items={filtered} />}
      </div>
    </div>
  );
}

function CalculatorGrid({ items }: { items: CalcType[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(c => <CalculatorCard key={c.id} calc={c} />)}
    </div>
  );
}

function CalculatorCard({ calc }: { calc: CalcType }) {
  return (
    <Link href={`/tools/${calc.slug}`}>
      <Card className="cursor-pointer group hover:border-primary/50 hover:shadow-sm transition-all h-full">
        <CardContent className="p-4 flex flex-col gap-3 h-full">
          {storageUrl(calc.featuredImageUrl) ? (
            <img src={storageUrl(calc.featuredImageUrl)} alt={calc.title} className="w-full h-28 object-cover rounded-lg" />
          ) : (
            <div className="w-full h-28 rounded-lg bg-primary/5 flex items-center justify-center">
              <Calculator className="h-8 w-8 text-primary/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">{calc.title}</h3>
            {calc.shortDescription && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{calc.shortDescription}</p>
            )}
          </div>
          <Badge variant="secondary" className="self-start text-xs capitalize">{calc.category}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
