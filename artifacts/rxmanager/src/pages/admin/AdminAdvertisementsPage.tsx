import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListAdminAdvertisements, useCreateAdvertisement, useUpdateAdvertisement,
  useDeleteAdvertisement, useListCountries, getListAdminAdvertisementsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Megaphone, Plus, Pencil, Trash2, ExternalLink, Globe, MapPin,
  Monitor, Smartphone, Maximize2, Eye, MousePointerClick, RotateCcw, TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BD_DIVISIONS = ["Dhaka", "Chittagong", "Rajshahi", "Khulna", "Barishal", "Sylhet", "Rangpur", "Mymensingh"];

interface Ad {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  location: string;
  customWidth?: number | null;
  customHeight?: number | null;
  desktopWidth?: number | null;
  desktopHeight?: number | null;
  mobileWidth?: number | null;
  mobileHeight?: number | null;
  targetCountries?: string | null;
  targetDivisions?: string | null;
  priority?: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  impressions?: number | null;
  clicks?: number | null;
}

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
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const LOCATIONS = [
  { value: "homepage_hero",   label: "Homepage — Hero" },
  { value: "homepage_middle", label: "Homepage — Middle" },
  { value: "homepage_bottom", label: "Homepage — Bottom" },
  { value: "doctors_listing", label: "Doctors — Listing" },
  { value: "doctor_detail",   label: "Doctor — Detail" },
  { value: "shop",            label: "Shop Page" },
  { value: "blog",            label: "Blog Page" },
];

interface FormState {
  title: string; imageUrl: string; linkUrl: string;
  location: string; priority: string;
  startDate: string; endDate: string; isActive: boolean;
  customWidth: string; customHeight: string;
  desktopWidth: string; desktopHeight: string;
  mobileWidth: string; mobileHeight: string;
  targetCountries: string[]; targetDivisions: string[];
}
const emptyForm: FormState = {
  title: "", imageUrl: "", linkUrl: "",
  location: "homepage_middle", priority: "0",
  startDate: "", endDate: "", isActive: true,
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

export default function AdminAdvertisementsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: ads } = useListAdminAdvertisements();
  const { data: countries } = useListCountries();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminAdvertisementsQueryKey() });
  const createAd = useCreateAdvertisement({ mutation: { onSuccess: invalidate } });
  const updateAd = useUpdateAdvertisement({ mutation: { onSuccess: invalidate } });
  const deleteAd = useDeleteAdvertisement({ mutation: { onSuccess: invalidate } });

  const [dialog, setDialog] = useState(false);
  const [editAd, setEditAd] = useState<Ad | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const sf = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const countryItems = (Array.isArray(countries) ? countries : []).map(
    (c: { id: number; name: string }) => ({ value: c.name, label: c.name })
  );
  const divisionItems = BD_DIVISIONS.map(d => ({ value: d, label: d }));
  const locationLabel = (v: string) => LOCATIONS.find(l => l.value === v)?.label ?? v;

  const handleOpen = (ad?: Ad) => {
    if (ad) {
      setEditAd(ad);
      sf({
        title: ad.title, imageUrl: ad.imageUrl, linkUrl: ad.linkUrl ?? "",
        location: ad.location, priority: String(ad.priority ?? 0),
        startDate: toLocalInput(ad.startDate), endDate: toLocalInput(ad.endDate),
        isActive: ad.isActive,
        customWidth: ad.customWidth?.toString() ?? "",
        customHeight: ad.customHeight?.toString() ?? "",
        desktopWidth: ad.desktopWidth?.toString() ?? "",
        desktopHeight: ad.desktopHeight?.toString() ?? "",
        mobileWidth: ad.mobileWidth?.toString() ?? "",
        mobileHeight: ad.mobileHeight?.toString() ?? "",
        targetCountries: parseJsonList(ad.targetCountries),
        targetDivisions: parseJsonList(ad.targetDivisions),
      });
    } else {
      setEditAd(null);
      setForm(emptyForm);
    }
    setDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toInt = (v: string) => v ? Number(v) : null;
    const payload = {
      title: form.title, imageUrl: form.imageUrl,
      linkUrl: form.linkUrl || undefined,
      location: form.location, priority: Number(form.priority) || 0,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      isActive: form.isActive,
      customWidth: toInt(form.customWidth), customHeight: toInt(form.customHeight),
      desktopWidth: toInt(form.desktopWidth), desktopHeight: toInt(form.desktopHeight),
      mobileWidth: toInt(form.mobileWidth), mobileHeight: toInt(form.mobileHeight),
      targetCountries: toJsonString(form.targetCountries),
      targetDivisions: toJsonString(form.targetDivisions),
    };
    try {
      if (editAd) {
        await updateAd.mutateAsync({ id: editAd.id, data: payload });
        toast({ title: "Advertisement updated" });
      } else {
        await createAd.mutateAsync({ data: payload });
        toast({ title: "Advertisement created" });
      }
      setDialog(false);
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this advertisement?")) return;
    try { await deleteAd.mutateAsync({ id }); toast({ title: "Deleted" }); }
    catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const handleResetAnalytics = async (id: number, title: string) => {
    if (!confirm(`Reset analytics for "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/advertisements/${id}/reset-analytics`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${document.cookie.match(/token=([^;]+)/)?.[1] ?? ""}` },
      });
      if (!res.ok) throw new Error();
      await invalidate();
      toast({ title: "Analytics reset" });
    } catch { toast({ title: "Failed to reset analytics", variant: "destructive" }); }
  };

  const allAds = Array.isArray(ads) ? ads : [];
  const totalImpressions = allAds.reduce((s, a) => s + (a.impressions ?? 0), 0);
  const totalClicks = allAds.reduce((s, a) => s + (a.clicks ?? 0), 0);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Advertisements</h1>
            <p className="text-muted-foreground text-sm mt-1">Time-windowed promotional blocks with targeting, sizing, and analytics</p>
          </div>
          <Button size="sm" onClick={() => handleOpen()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Add Ad
          </Button>
        </div>

        {/* Summary stats */}
        {allAds.length > 0 && (
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

        {!allAds.length ? (
          <Card><CardContent className="py-16 text-center">
            <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No advertisements yet.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAds.map(ad => {
              const imp = ad.impressions ?? 0;
              const clk = ad.clicks ?? 0;
              return (
                <Card key={ad.id} className={!ad.isActive ? "opacity-60" : ""}>
                  <div className="aspect-[16/6] bg-muted rounded-t-lg overflow-hidden">
                    <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x150?text=Ad"; }} />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm truncate">{ad.title}</p>
                      <Badge variant={ad.isActive ? "default" : "secondary"} className="text-xs shrink-0 ml-2">
                        {ad.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="outline" className="text-xs">{locationLabel(ad.location)}</Badge>
                      <Badge variant="outline" className="text-xs">P{ad.priority ?? 0}</Badge>
                      {(ad.desktopWidth || ad.customWidth) && (
                        <Badge variant="outline" className="text-xs flex items-center gap-0.5">
                          <Monitor className="h-2.5 w-2.5" />
                          {ad.desktopWidth ?? ad.customWidth}×{ad.desktopHeight ?? ad.customHeight}
                        </Badge>
                      )}
                      {ad.mobileWidth && (
                        <Badge variant="outline" className="text-xs flex items-center gap-0.5">
                          <Smartphone className="h-2.5 w-2.5" />{ad.mobileWidth}×{ad.mobileHeight}
                        </Badge>
                      )}
                      {ad.targetCountries && parseJsonList(ad.targetCountries).length > 0 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-0.5">
                          <Globe className="h-2.5 w-2.5" />{parseJsonList(ad.targetCountries).length} countries
                        </Badge>
                      )}
                      {ad.targetDivisions && parseJsonList(ad.targetDivisions).length > 0 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />{parseJsonList(ad.targetDivisions).join(", ")}
                        </Badge>
                      )}
                    </div>

                    {/* Analytics row */}
                    <div className="rounded-lg bg-muted/50 px-3 py-2 mb-3 grid grid-cols-3 divide-x divide-border text-center text-xs sm:text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5"><Eye className="h-3 w-3" />Views</p>
                        <p className="text-sm font-semibold mt-0.5">{imp.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5"><MousePointerClick className="h-3 w-3" />Clicks</p>
                        <p className="text-sm font-semibold mt-0.5">{clk.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5"><TrendingUp className="h-3 w-3" />CTR</p>
                        <p className="text-sm font-semibold mt-0.5">{ctr(imp, clk)}</p>
                      </div>
                    </div>

                    {imp > 0 && (
                      <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                        <div
                          className="bg-primary rounded-full h-1.5 transition-all"
                          style={{ width: `${Math.min((clk / imp) * 100, 100)}%` }}
                        />
                      </div>
                    )}

                    {(ad.startDate || ad.endDate) && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : "—"} →{" "}
                        {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : "—"}
                      </p>
                    )}
                    {ad.linkUrl && (
                      <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mb-3">
                        <ExternalLink className="h-3 w-3" />{ad.linkUrl}
                      </a>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpen(ad)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                      <Button variant="ghost" size="icon" title="Reset analytics"
                        onClick={() => handleResetAnalytics(ad.id, ad.title)}>
                        <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ad.id)}>
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
          <DialogHeader><DialogTitle>{editAd ? "Edit Advertisement" : "Add Advertisement"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Title *</Label><Input required value={form.title} onChange={e => sf({ title: e.target.value })} placeholder="Pharmacy promo" /></div>
              <div className="space-y-1.5"><Label>Image URL *</Label><Input required type="url" value={form.imageUrl} onChange={e => sf({ imageUrl: e.target.value })} placeholder="https://..." /></div>
              <div className="space-y-1.5"><Label>Link URL</Label><Input type="url" value={form.linkUrl} onChange={e => sf({ linkUrl: e.target.value })} placeholder="https://..." /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Display Position</Label>
                <Select value={form.location} onValueChange={v => sf({ location: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOCATIONS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Priority (higher = first)</Label><Input type="number" value={form.priority} onChange={e => sf({ priority: e.target.value })} /></div>
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />Custom Size (px)</p>
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
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium text-sm">Active</p>
                <p className="text-xs text-muted-foreground">Inactive ads are hidden from the site</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => sf({ isActive: v })} />
            </div>
            <Button type="submit" className="w-full" disabled={createAd.isPending || updateAd.isPending}>
              {editAd ? "Update Advertisement" : "Create Advertisement"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
