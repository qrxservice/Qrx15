import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListBanners, useCreateBanner, useUpdateBanner, useDeleteBanner,
  useListCountries, getListBannersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Image, Plus, Pencil, Trash2, ExternalLink, Globe, MapPin,
  Monitor, Smartphone, Maximize2, Eye, MousePointerClick, RotateCcw, TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BD_DIVISIONS = ["Dhaka", "Chittagong", "Rajshahi", "Khulna", "Barishal", "Sylhet", "Rangpur", "Mymensingh"];

interface Banner {
  id: number;
  title: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  description?: string | null;
  position?: string | null;
  size?: string | null;
  customWidth?: number | null;
  customHeight?: number | null;
  desktopWidth?: number | null;
  desktopHeight?: number | null;
  mobileWidth?: number | null;
  mobileHeight?: number | null;
  targetCountries?: string | null;
  targetDivisions?: string | null;
  isActive: boolean;
  displayOrder?: number | null;
  priority?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  impressions?: number | null;
  clicks?: number | null;
}

const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

function parseJsonList(raw?: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}
function toJsonString(arr: string[]): string | null {
  return arr.length > 0 ? JSON.stringify(arr) : null;
}
function ctr(impressions: number, clicks: number): string {
  if (!impressions) return "—";
  return `${((clicks / impressions) * 100).toFixed(1)}%`;
}

const POSITIONS = [
  { value: "homepage_top",    label: "Homepage — Top" },
  { value: "homepage_middle", label: "Homepage — Middle" },
  { value: "homepage_bottom", label: "Homepage — Bottom" },
  { value: "doctors_listing", label: "Doctors — Listing" },
  { value: "doctor_detail",   label: "Doctor — Detail" },
  { value: "shop",            label: "Shop Page" },
  { value: "blog",            label: "Blog Page" },
  { value: "prescription",    label: "Prescription Page" },
];
const SIZES = [
  { value: "small",  label: "Small (~96px)" },
  { value: "medium", label: "Medium (~144px)" },
  { value: "large",  label: "Large (~208px)" },
  { value: "custom", label: "Custom (use size fields)" },
];
const positionLabel = (v?: string | null) => POSITIONS.find(p => p.value === v)?.label ?? v ?? "—";

interface FormState {
  title: string; imageUrl: string; linkUrl: string; description: string;
  position: string; size: string; isActive: boolean; displayOrder: string; priority: string;
  startDate: string; endDate: string;
  customWidth: string; customHeight: string;
  desktopWidth: string; desktopHeight: string;
  mobileWidth: string; mobileHeight: string;
  targetCountries: string[]; targetDivisions: string[];
}
const emptyForm: FormState = {
  title: "", imageUrl: "", linkUrl: "", description: "",
  position: "homepage_top", size: "medium", isActive: true,
  displayOrder: "", priority: "",
  startDate: "", endDate: "",
  customWidth: "", customHeight: "",
  desktopWidth: "", desktopHeight: "",
  mobileWidth: "", mobileHeight: "",
  targetCountries: [], targetDivisions: [],
};

function MultiCheckboxList({ label, icon, items, selected, onChange }: {
  label: string; icon: React.ReactNode;
  items: { value: string; label: string }[];
  selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val]);
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">{icon}{label}
        {selected.length > 0 && (
          <span className="ml-auto text-xs text-primary cursor-pointer" onClick={() => onChange([])}>Clear all</span>
        )}
      </Label>
      <ScrollArea className="h-32 rounded border p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {items.map(it => (
            <label key={it.value} className="flex items-center gap-1.5 cursor-pointer text-xs py-0.5 hover:text-primary">
              <Checkbox checked={selected.includes(it.value)} onCheckedChange={() => toggle(it.value)} />
              {it.label}
            </label>
          ))}
        </div>
      </ScrollArea>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(v => <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>)}
        </div>
      )}
    </div>
  );
}

export default function AdminBannersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: banners } = useListBanners({ all: "true" });
  const { data: countries } = useListCountries();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBannersQueryKey({ all: "true" }) });
  const createBanner = useCreateBanner({ mutation: { onSuccess: invalidate } });
  const updateBanner = useUpdateBanner({ mutation: { onSuccess: invalidate } });
  const deleteBanner = useDeleteBanner({ mutation: { onSuccess: invalidate } });

  const [dialog, setDialog] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const sf = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const countryItems = (Array.isArray(countries) ? countries : []).map(
    (c: { id: number; name: string }) => ({ value: c.name, label: c.name })
  );
  const divisionItems = BD_DIVISIONS.map(d => ({ value: d, label: d }));

  const handleOpen = (banner?: Banner) => {
    if (banner) {
      setEditBanner(banner);
      sf({
        title: banner.title, imageUrl: banner.imageUrl ?? "",
        linkUrl: banner.linkUrl ?? "", description: banner.description ?? "",
        position: banner.position ?? "homepage_top", size: banner.size ?? "medium",
        isActive: banner.isActive, displayOrder: banner.displayOrder?.toString() ?? "",
        priority: banner.priority?.toString() ?? "",
        startDate: toLocalInput(banner.startDate), endDate: toLocalInput(banner.endDate),
        customWidth: banner.customWidth?.toString() ?? "",
        customHeight: banner.customHeight?.toString() ?? "",
        desktopWidth: banner.desktopWidth?.toString() ?? "",
        desktopHeight: banner.desktopHeight?.toString() ?? "",
        mobileWidth: banner.mobileWidth?.toString() ?? "",
        mobileHeight: banner.mobileHeight?.toString() ?? "",
        targetCountries: parseJsonList(banner.targetCountries),
        targetDivisions: parseJsonList(banner.targetDivisions),
      });
    } else {
      setEditBanner(null);
      setForm(emptyForm);
    }
    setDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toInt = (v: string) => v ? Number(v) : null;
    const payload = {
      title: form.title, imageUrl: form.imageUrl,
      linkUrl: form.linkUrl || undefined, description: form.description || undefined,
      position: form.position, size: form.size, isActive: form.isActive,
      displayOrder: form.displayOrder ? Number(form.displayOrder) : undefined,
      priority: form.priority ? Number(form.priority) : undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      customWidth: toInt(form.customWidth), customHeight: toInt(form.customHeight),
      desktopWidth: toInt(form.desktopWidth), desktopHeight: toInt(form.desktopHeight),
      mobileWidth: toInt(form.mobileWidth), mobileHeight: toInt(form.mobileHeight),
      targetCountries: toJsonString(form.targetCountries),
      targetDivisions: toJsonString(form.targetDivisions),
    };
    try {
      if (editBanner) {
        await updateBanner.mutateAsync({ id: editBanner.id, data: payload });
        toast({ title: "Banner updated" });
      } else {
        await createBanner.mutateAsync({ data: payload });
        toast({ title: "Banner created" });
      }
      setDialog(false);
    } catch { toast({ title: "Failed to save banner", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this banner?")) return;
    try { await deleteBanner.mutateAsync({ id }); toast({ title: "Deleted" }); }
    catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const handleResetAnalytics = async (id: number, title: string) => {
    if (!confirm(`Reset impression and click counters for "${title}"?`)) return;
    try {
      const res = await fetch(`/api/banners/${id}/reset-analytics`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${document.cookie.match(/token=([^;]+)/)?.[1] ?? ""}` },
      });
      if (!res.ok) throw new Error();
      await invalidate();
      toast({ title: "Analytics reset" });
    } catch { toast({ title: "Failed to reset analytics", variant: "destructive" }); }
  };

  // Summary stats across all banners
  const allBanners = Array.isArray(banners) ? banners : [];
  const totalImpressions = allBanners.reduce((s, b) => s + (b.impressions ?? 0), 0);
  const totalClicks = allBanners.reduce((s, b) => s + (b.clicks ?? 0), 0);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Banners</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage promotional banners with targeting, sizing, and analytics</p>
          </div>
          <Button size="sm" onClick={() => handleOpen()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Add Banner
          </Button>
        </div>

        {/* Summary stats */}
        {allBanners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3.5 w-3.5" />Total Impressions</p>
              <p className="text-2xl font-bold mt-1">{totalImpressions.toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" />Total Clicks</p>
              <p className="text-2xl font-bold mt-1">{totalClicks.toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />Avg CTR</p>
              <p className="text-2xl font-bold mt-1">{ctr(totalImpressions, totalClicks)}</p>
            </CardContent></Card>
          </div>
        )}

        {!allBanners.length ? (
          <Card><CardContent className="py-16 text-center">
            <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No banners yet. Create one to display on the site.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBanners.map(banner => {
              const imp = banner.impressions ?? 0;
              const clk = banner.clicks ?? 0;
              return (
                <Card key={banner.id} className={!banner.isActive ? "opacity-60" : ""}>
                  <div className="aspect-[16/6] bg-muted rounded-t-lg overflow-hidden">
                    <img src={banner.imageUrl ?? ""} alt={banner.title} className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x150?text=Banner"; }} />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm truncate">{banner.title}</p>
                      <Badge variant={banner.isActive ? "default" : "secondary"} className="text-xs shrink-0 ml-2">
                        {banner.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="outline" className="text-xs">{positionLabel(banner.position)}</Badge>
                      {banner.size && <Badge variant="outline" className="text-xs capitalize">{banner.size}</Badge>}
                      {banner.priority ? <Badge variant="outline" className="text-xs">P{banner.priority}</Badge> : null}
                      {(banner.desktopWidth || banner.customWidth) && (
                        <Badge variant="outline" className="text-xs flex items-center gap-0.5">
                          <Monitor className="h-2.5 w-2.5" />
                          {banner.desktopWidth ?? banner.customWidth}×{banner.desktopHeight ?? banner.customHeight}
                        </Badge>
                      )}
                      {banner.mobileWidth && (
                        <Badge variant="outline" className="text-xs flex items-center gap-0.5">
                          <Smartphone className="h-2.5 w-2.5" />{banner.mobileWidth}×{banner.mobileHeight}
                        </Badge>
                      )}
                      {banner.targetCountries && parseJsonList(banner.targetCountries).length > 0 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-0.5">
                          <Globe className="h-2.5 w-2.5" />{parseJsonList(banner.targetCountries).length} countries
                        </Badge>
                      )}
                      {banner.targetDivisions && parseJsonList(banner.targetDivisions).length > 0 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />{parseJsonList(banner.targetDivisions).join(", ")}
                        </Badge>
                      )}
                    </div>

                    {/* Analytics row */}
                    <div className="rounded-lg bg-muted/50 px-3 py-2 mb-3 grid grid-cols-3 divide-x divide-border text-center text-xs sm:text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                          <Eye className="h-3 w-3" />Views
                        </p>
                        <p className="text-sm font-semibold mt-0.5">{imp.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                          <MousePointerClick className="h-3 w-3" />Clicks
                        </p>
                        <p className="text-sm font-semibold mt-0.5">{clk.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />CTR
                        </p>
                        <p className="text-sm font-semibold mt-0.5">{ctr(imp, clk)}</p>
                      </div>
                    </div>

                    {/* CTR bar */}
                    {imp > 0 && (
                      <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                        <div
                          className="bg-primary rounded-full h-1.5 transition-all"
                          style={{ width: `${Math.min((clk / imp) * 100, 100)}%` }}
                        />
                      </div>
                    )}

                    {banner.linkUrl && (
                      <a href={banner.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mb-3">
                        <ExternalLink className="h-3 w-3" />{banner.linkUrl}
                      </a>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpen(banner)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                      <Button variant="ghost" size="icon" title="Reset analytics"
                        onClick={() => handleResetAnalytics(banner.id, banner.title)}>
                        <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(banner.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editBanner ? "Edit Banner" : "Add Banner"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Title *</Label><Input required value={form.title} onChange={e => sf({ title: e.target.value })} placeholder="Summer Health Campaign" /></div>
              <div className="space-y-1.5"><Label>Image URL *</Label><Input required type="url" value={form.imageUrl} onChange={e => sf({ imageUrl: e.target.value })} placeholder="https://..." /></div>
              <div className="space-y-1.5"><Label>Link URL</Label><Input type="url" value={form.linkUrl} onChange={e => sf({ linkUrl: e.target.value })} placeholder="https://..." /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => sf({ description: e.target.value })} placeholder="Short description..." /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Display Position</Label>
                <Select value={form.position} onValueChange={v => sf({ position: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Preset Size</Label>
                <Select value={form.size} onValueChange={v => sf({ size: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />Custom Size (px) — overrides preset</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Width</Label><Input type="number" min={1} value={form.customWidth} onChange={e => sf({ customWidth: e.target.value })} placeholder="e.g. 800" /></div>
                <div className="space-y-1"><Label className="text-xs">Height</Label><Input type="number" min={1} value={form.customHeight} onChange={e => sf({ customHeight: e.target.value })} placeholder="e.g. 200" /></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" />Desktop Size (px)</p>
                <div className="space-y-1"><Label className="text-xs">Width</Label><Input type="number" min={1} value={form.desktopWidth} onChange={e => sf({ desktopWidth: e.target.value })} placeholder="1200" /></div>
                <div className="space-y-1"><Label className="text-xs">Height</Label><Input type="number" min={1} value={form.desktopHeight} onChange={e => sf({ desktopHeight: e.target.value })} placeholder="300" /></div>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" />Mobile Size (px)</p>
                <div className="space-y-1"><Label className="text-xs">Width</Label><Input type="number" min={1} value={form.mobileWidth} onChange={e => sf({ mobileWidth: e.target.value })} placeholder="390" /></div>
                <div className="space-y-1"><Label className="text-xs">Height</Label><Input type="number" min={1} value={form.mobileHeight} onChange={e => sf({ mobileHeight: e.target.value })} placeholder="150" /></div>
              </div>
            </div>
            <MultiCheckboxList
              label="Country Targeting (leave empty to show everywhere)"
              icon={<Globe className="h-3.5 w-3.5" />}
              items={countryItems}
              selected={form.targetCountries}
              onChange={v => sf({ targetCountries: v })}
            />
            <MultiCheckboxList
              label="Division / State Targeting (Bangladesh)"
              icon={<MapPin className="h-3.5 w-3.5" />}
              items={divisionItems}
              selected={form.targetDivisions}
              onChange={v => sf({ targetDivisions: v })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Start Date &amp; Time</Label><Input type="datetime-local" value={form.startDate} onChange={e => sf({ startDate: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>End Date &amp; Time</Label><Input type="datetime-local" value={form.endDate} onChange={e => sf({ endDate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Priority (higher = first)</Label><Input type="number" value={form.priority} onChange={e => sf({ priority: e.target.value })} placeholder="0" /></div>
              <div className="space-y-1.5"><Label>Display Order</Label><Input type="number" value={form.displayOrder} onChange={e => sf({ displayOrder: e.target.value })} placeholder="0" /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium text-sm">Active</p>
                <p className="text-xs text-muted-foreground">Inactive banners are hidden from the site</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => sf({ isActive: v })} />
            </div>
            <Button type="submit" className="w-full" disabled={createBanner.isPending || updateBanner.isPending}>
              {editBanner ? "Update Banner" : "Create Banner"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
