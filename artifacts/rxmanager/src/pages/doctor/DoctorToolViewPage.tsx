import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Wrench } from "lucide-react";
import { useTool, useAddFavorite, useRemoveFavorite, useRecordToolUsage, useDoctorFavorites } from "@/lib/tools-api";

function buildSrcdoc(html: string, css: string, js: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:12px;font-family:system-ui,sans-serif}${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
}

export default function DoctorToolViewPage() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const slug = params.slug ?? "";

  const { data: tool, isLoading, isError } = useTool(slug);
  const { data: favorites = [] } = useDoctorFavorites();
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();
  const recordUsage = useRecordToolUsage();

  const isFavorite = favorites.some(f => f.id === tool?.id);

  // Record usage when tool loads
  useEffect(() => {
    if (tool?.id) {
      recordUsage.mutate(tool.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool?.id]);

  const handleFavoriteToggle = async () => {
    if (!tool) return;
    try {
      if (isFavorite) {
        await removeFav.mutateAsync(tool.id);
        toast({ title: "Removed from favorites" });
      } else {
        await addFav.mutateAsync(tool.id);
        toast({ title: "Added to favorites" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="doctor" hideSidebar>
        <div className="py-16 text-center text-muted-foreground">Loading tool...</div>
      </DashboardLayout>
    );
  }

  if (isError || !tool) {
    return (
      <DashboardLayout role="doctor" hideSidebar>
        <div className="max-w-lg mx-auto py-16 text-center">
          <Wrench className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <h2 className="text-lg font-semibold mb-2">Tool not found</h2>
          <p className="text-muted-foreground text-sm mb-4">This tool may have been removed or is not published.</p>
          <Button variant="outline" onClick={() => setLocation("/doctor/tools")}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Tools
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="doctor" hideSidebar>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/doctor/tools")} className="shrink-0">
              <ArrowLeft className="mr-1.5 h-4 w-4" />Tools
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2 min-w-0">
              {tool.icon && <span className="text-lg shrink-0">{tool.icon}</span>}
              <h1 className="font-semibold text-base truncate">{tool.name}</h1>
              {tool.categoryName && <Badge variant="outline" className="text-xs shrink-0">{tool.categoryName}</Badge>}
            </div>
          </div>
          <Button
            variant={isFavorite ? "default" : "outline"}
            size="sm"
            onClick={handleFavoriteToggle}
            className={isFavorite ? "text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100" : ""}
          >
            <Star className={`mr-2 h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
            {isFavorite ? "Favorited" : "Add to Favorites"}
          </Button>
        </div>

        {/* Description */}
        {tool.shortDescription && (
          <p className="text-sm text-muted-foreground">{tool.shortDescription}</p>
        )}

        {/* Sandbox iframe */}
        <Card className="overflow-hidden border-2">
          <CardContent className="p-0">
            <iframe
              srcDoc={buildSrcdoc(tool.htmlCode ?? "", tool.cssCode ?? "", tool.jsCode ?? "")}
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
              className="w-full border-0"
              style={{ minHeight: 600, height: "calc(100vh - 280px)" }}
              title={tool.name}
            />
          </CardContent>
        </Card>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Department: <span className="font-medium text-foreground">{tool.department === "all" ? "All" : tool.department}</span></span>
          <span>Version: <span className="font-medium text-foreground">{tool.version}</span></span>
          <span>Updated: <span className="font-medium text-foreground">{new Date(tool.updatedAt).toLocaleDateString("en-GB")}</span></span>
        </div>
      </div>
    </DashboardLayout>
  );
}
