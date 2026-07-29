import { useState } from "react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Star, Clock, Wrench, ExternalLink } from "lucide-react";
import {
  usePublicTools, useDoctorFavorites, useDoctorRecentTools,
  useAddFavorite, useRemoveFavorite, useToolCategories,
  type Tool,
} from "@/lib/tools-api";
import { useListDepartments } from "@workspace/api-client-react";

function ToolCard({ tool, onFavoriteToggle }: { tool: Tool; onFavoriteToggle?: (id: number, isFav: boolean) => void }) {
  return (
    <Card className="flex flex-col hover:border-primary/40 transition-colors group">
      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {tool.icon && <span className="text-xl shrink-0">{tool.icon}</span>}
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate">{tool.name}</h3>
              {tool.categoryName && (
                <Badge variant="outline" className="text-xs mt-0.5">{tool.categoryName}</Badge>
              )}
            </div>
          </div>
          {onFavoriteToggle && (
            <button
              type="button"
              onClick={e => { e.preventDefault(); onFavoriteToggle(tool.id, !!tool.isFavorite); }}
              className={`shrink-0 p-1 rounded transition-colors ${tool.isFavorite ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-amber-500"}`}
              title={tool.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={`h-4 w-4 ${tool.isFavorite ? "fill-current" : ""}`} />
            </button>
          )}
        </div>

        {/* Description */}
        {tool.shortDescription && (
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{tool.shortDescription}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {tool.department === "all" ? "All Departments" : tool.department}
          </span>
          <Link href={`/doctor/tools/${tool.slug}`}>
            <Button size="sm" className="h-7 text-xs gap-1">
              Open <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DoctorToolsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("_all");
  const [filterDepartment, setFilterDepartment] = useState("_all");

  const { data: allTools = [], refetch } = usePublicTools({
    search,
    category: filterCategory !== "_all" ? filterCategory : undefined,
    department: filterDepartment !== "_all" ? filterDepartment : undefined,
  });
  const { data: favorites = [], refetch: refetchFavs } = useDoctorFavorites();
  const { data: recent = [] } = useDoctorRecentTools();
  const { data: categories } = useToolCategories();
  const { data: departments } = useListDepartments();
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();

  // Enrich allTools with isFavorite flag
  const favSet = new Set(favorites.map(f => f.id));
  const enrichedTools = allTools.map(t => ({ ...t, isFavorite: favSet.has(t.id) }));
  const enrichedFavs = favorites.map(t => ({ ...t, isFavorite: true }));
  const enrichedRecent = recent.map(t => ({ ...t, isFavorite: favSet.has(t.id) }));

  const handleFavoriteToggle = async (id: number, isFav: boolean) => {
    try {
      if (isFav) {
        await removeFav.mutateAsync(id);
        toast({ title: "Removed from favorites" });
      } else {
        await addFav.mutateAsync(id);
        toast({ title: "Added to favorites" });
      }
      refetch(); refetchFavs();
    } catch {
      toast({ title: "Error updating favorites", variant: "destructive" });
    }
  };

  const ToolGrid = ({ tools }: { tools: Tool[] }) => (
    tools.length === 0 ? (
      <div className="py-16 text-center text-muted-foreground col-span-full">
        <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No tools found</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map(t => <ToolCard key={t.id} tool={t} onFavoriteToggle={handleFavoriteToggle} />)}
      </div>
    )
  );

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" /> Medical Tools
          </h1>
          <p className="text-muted-foreground mt-1">Interactive calculators and clinical tools for your practice</p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search tools..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Categories</SelectItem>
              {categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Departments</SelectItem>
              {(Array.isArray(departments) ? departments : []).map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="all">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1 min-w-0">
                <Wrench className="mr-1 h-4 w-4 shrink-0" />
                <span className="truncate">All ({enrichedTools.length})</span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex-1 min-w-0">
                <Star className="mr-1 h-4 w-4 shrink-0" />
                <span className="truncate">Favorites ({enrichedFavs.length})</span>
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex-1 min-w-0">
                <Clock className="mr-1 h-4 w-4 shrink-0" />
                <span className="truncate">Recent ({enrichedRecent.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-4">
            <ToolGrid tools={enrichedTools} />
          </TabsContent>

          <TabsContent value="favorites" className="mt-4">
            <ToolGrid tools={enrichedFavs} />
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            {enrichedRecent.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No recently used tools yet. Open a tool to track it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {enrichedRecent.map(t => <ToolCard key={t.id} tool={t} onFavoriteToggle={handleFavoriteToggle} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
