import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListSliders, useCreateSlider, useUpdateSlider, useDeleteSlider,
  getListSlidersQueryKey,
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
import { Separator } from "@/components/ui/separator";
import {
  SlidersHorizontal, Plus, Pencil, Trash2, ExternalLink,
  Monitor, Smartphone, Tablet, Maximize2, Play, ChevronRight, ChevronLeft,
  Circle, ArrowLeftRight, Eye, EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const POSITIONS = [
  { value: "hero",         label: "Hero Slider (top, full-width behind nav)" },
  { value: "full_width",   label: "Full Width (between sections)" },
  { value: "boxed",        label: "Boxed (container width)" },
  { value: "middle",       label: "Middle Page" },
  { value: "before_footer",label: "Before Footer" },
];

interface Slider {
  id: number;
  title: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  buttonText?: string | null;
  description?: string | null;
  position: string;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  priority: number;
  displayOrder: number;
  autoPlay: boolean;
  slideInterval: number;
  showArrows: boolean;
  showDots: boolean;
  desktopWidth?: number | null;
  desktopHeight?: number | null;
  mobileWidth?: number | null;
  mobileHeight?: number | null;
  tabletWidth?: number | null;
  tabletHeight?: number | null;
  customWidth?: number | null;
  customHeight?: number | null;
}

interface FormState {
  title: string; imageUrl: string; linkUrl: string; buttonText: string; description: string;
  position: string; isActive: boolean;
  startDate: string; endDate: string;
  priority: string; displayOrder: string;
  autoPlay: boolean; slideInterval: string; showArrows: boolean; showDots: boolean;
  desktopWidth: string; desktopHeight: string;
  mobileWidth: string; mobileHeight: string;
  tabletWidth: string; tabletHeight: string;
  customWidth: string; customHeight: string;
}

const emptyForm: FormState = {
  title: "", imageUrl: "", linkUrl: "", buttonText: "", description: "",
  position: "hero", isActive: true,
  startDate: "", endDate: "",
  priority: "0", displayOrder: "0",
  autoPlay: true, slideInterval: "5000", showArrows: true, showDots: true,
  desktopWidth: "", desktopHeight: "480",
  mobileWidth: "", mobileHeight: "",
  tabletWidth: "", tabletHeight: "",
  customWidth: "", customHeight: "",
};

const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const posLabel = (v: string) => POSITIONS.find(p => p.value === v)?.label ?? v;

export default function AdminSlidersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sliders } = useListSliders({ all: "true" });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListSlidersQueryKey({ all: "true" }) });
  const createSlider = useCreateSlider({ mutation: { onSuccess: invalidate } });
  const updateSlider = useUpdateSlider({ mutation: { onSuccess: invalidate } });
  const deleteSlider = useDeleteSlider({ mutation: { onSuccess: invalidate } });

  const [dialog, setDialog] = useState(false);
  const [editSlider, setEditSlider] = useState<Slider | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const sf = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const allSliders: Slider[] = Array.isArray(sliders) ? (sliders as Slider[]) : [];

  const handleOpen = (s?: Slider) => {
    if (s) {
      setEditSlider(s);
      sf({
        title: s.title, imageUrl: s.imageUrl ?? "", linkUrl: s.linkUrl ?? "",
        buttonText: s.buttonText ?? "", description: s.description ?? "",
        position: s.position, isActive: s.isActive,
        startDate: toLocalInput(s.startDate), endDate: toLocalInput(s.endDate),
        priority: String(s.priority), displayOrder: String(s.displayOrder),
        autoPlay: s.autoPlay, slideInterval: String(s.slideInterval),
        showArrows: s.showArrows, showDots: s.showDots,
        desktopWidth: s.desktopWidth?.toString() ?? "",
        desktopHeight: s.desktopHeight?.toString() ?? "480",
        mobileWidth: s.mobileWidth?.toString() ?? "",
        mobileHeight: s.mobileHeight?.toString() ?? "",
        tabletWidth: s.tabletWidth?.toString() ?? "",
        tabletHeight: s.tabletHeight?.toString() ?? "",
        customWidth: s.customWidth?.toString() ?? "",
        customHeight: s.customHeight?.toString() ?? "",
      });
    } else {
      setEditSlider(null);
      setForm(emptyForm);
    }
    setDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toInt = (v: string) => v ? Number(v) : null;
    const payload = {
      title: form.title,
      imageUrl: form.imageUrl || undefined,
      linkUrl: form.linkUrl || undefined,
      buttonText: form.buttonText || undefined,
      description: form.description || undefined,
      position: form.position,
      isActive: form.isActive,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      priority: Number(form.priority) || 0,
      displayOrder: Number(form.displayOrder) || 0,
      autoPlay: form.autoPlay,
      slideInterval: Number(form.slideInterval) || 5000,
      showArrows: form.showArrows,
      showDots: form.showDots,
      desktopWidth: toInt(form.desktopWidth),
      desktopHeight: toInt(form.desktopHeight),
      mobileWidth: toInt(form.mobileWidth),
      mobileHeight: toInt(form.mobileHeight),
      tabletWidth: toInt(form.tabletWidth),
      tabletHeight: toInt(form.tabletHeight),
      customWidth: toInt(form.customWidth),
      customHeight: toInt(form.customHeight),
    };
    try {
      if (editSlider) {
        await updateSlider.mutateAsync({ id: editSlider.id, data: payload });
        toast({ title: "Slider updated" });
      } else {
        await createSlider.mutateAsync({ data: payload });
        toast({ title: "Slider created" });
      }
      setDialog(false);
    } catch {
      toast({ title: "Failed to save slider", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this slider?")) return;
    try {
      await deleteSlider.mutateAsync({ id });
      toast({ title: "Deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleToggleActive = async (s: Slider) => {
    try {
      await updateSlider.mutateAsync({ id: s.id, data: { title: s.title, isActive: !s.isActive } });
      toast({ title: s.isActive ? "Slider hidden" : "Slider activated" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-6 w-6 text-primary" />
              Image Sliders
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage homepage slideshows — control position, size, timing, and display options
            </p>
          </div>
          <Button size="sm" onClick={() => handleOpen()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Add Slider
          </Button>
        </div>

        {allSliders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <SlidersHorizontal className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No sliders yet. Create one to display image slideshows on the homepage.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allSliders.map(s => (
              <Card key={s.id} className={!s.isActive ? "opacity-60" : ""}>
                <div className="aspect-[16/6] bg-muted rounded-t-lg overflow-hidden relative">
                  {s.imageUrl ? (
                    <img
                      src={s.imageUrl}
                      alt={s.title}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x150?text=Slider"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                      <SlidersHorizontal className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant={s.isActive ? "default" : "secondary"} className="text-xs">
                      {s.isActive ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-medium text-sm truncate">{s.title}</p>
                    {s.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">{posLabel(s.position)}</Badge>
                    {s.autoPlay && (
                      <Badge variant="outline" className="text-xs flex items-center gap-0.5">
                        <Play className="h-2.5 w-2.5" />{s.slideInterval / 1000}s
                      </Badge>
                    )}
                    {s.showArrows && <Badge variant="outline" className="text-xs flex items-center gap-0.5"><ChevronLeft className="h-2.5 w-2.5" /><ChevronRight className="h-2.5 w-2.5" />Arrows</Badge>}
                    {s.showDots && <Badge variant="outline" className="text-xs flex items-center gap-0.5"><Circle className="h-2 w-2" />Dots</Badge>}
                    {s.desktopHeight && (
                      <Badge variant="outline" className="text-xs flex items-center gap-0.5">
                        <Monitor className="h-2.5 w-2.5" />{s.desktopWidth ? `${s.desktopWidth}×` : ""}{s.desktopHeight}px
                      </Badge>
                    )}
                    {s.mobileHeight && (
                      <Badge variant="outline" className="text-xs flex items-center gap-0.5">
                        <Smartphone className="h-2.5 w-2.5" />{s.mobileHeight}px
                      </Badge>
                    )}
                    {s.priority > 0 && <Badge variant="outline" className="text-xs">P{s.priority}</Badge>}
                  </div>

                  {s.linkUrl && (
                    <a href={s.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /><span className="truncate">{s.linkUrl}</span>
                    </a>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpen(s)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      title={s.isActive ? "Hide slider" : "Activate slider"}
                      onClick={() => handleToggleActive(s)}
                    >
                      {s.isActive ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSlider ? "Edit Slider" : "Add Slider"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">

            {/* Basic info */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input required value={form.title} onChange={e => sf({ title: e.target.value })} placeholder="Summer Health Campaign" />
              </div>
              <div className="space-y-1.5">
                <Label>Image URL</Label>
                <Input type="url" value={form.imageUrl} onChange={e => sf({ imageUrl: e.target.value })} placeholder="https://..." />
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="preview" className="h-20 w-full object-cover rounded border mt-1"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Link URL</Label>
                <Input type="url" value={form.linkUrl} onChange={e => sf({ linkUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label>Button Text</Label>
                <Input value={form.buttonText} onChange={e => sf({ buttonText: e.target.value })} placeholder="Learn More" />
              </div>
              <div className="space-y-1.5">
                <Label>Short Description</Label>
                <Textarea rows={2} value={form.description} onChange={e => sf({ description: e.target.value })} placeholder="Brief overlay text..." />
              </div>
            </div>

            <Separator />

            {/* Display options */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <ArrowLeftRight className="h-3.5 w-3.5" />Display Options
              </p>
              <div className="space-y-1.5">
                <Label>Position on Homepage</Label>
                <Select value={form.position} onValueChange={v => sf({ position: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority (higher = shown first)</Label>
                  <Input type="number" value={form.priority} onChange={e => sf({ priority: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Display Order</Label>
                  <Input type="number" value={form.displayOrder} onChange={e => sf({ displayOrder: e.target.value })} placeholder="0" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Size customization */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Maximize2 className="h-3.5 w-3.5" />Size Customization (px)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" />Desktop</p>
                  <div className="space-y-1"><Label className="text-xs">Width (leave empty = full)</Label><Input type="number" min={1} value={form.desktopWidth} onChange={e => sf({ desktopWidth: e.target.value })} placeholder="auto" /></div>
                  <div className="space-y-1"><Label className="text-xs">Height *</Label><Input type="number" min={100} value={form.desktopHeight} onChange={e => sf({ desktopHeight: e.target.value })} placeholder="480" /></div>
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1.5"><Tablet className="h-3.5 w-3.5" />Tablet</p>
                  <div className="space-y-1"><Label className="text-xs">Width</Label><Input type="number" min={1} value={form.tabletWidth} onChange={e => sf({ tabletWidth: e.target.value })} placeholder="auto" /></div>
                  <div className="space-y-1"><Label className="text-xs">Height</Label><Input type="number" min={1} value={form.tabletHeight} onChange={e => sf({ tabletHeight: e.target.value })} placeholder="auto" /></div>
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" />Mobile</p>
                  <div className="space-y-1"><Label className="text-xs">Width</Label><Input type="number" min={1} value={form.mobileWidth} onChange={e => sf({ mobileWidth: e.target.value })} placeholder="auto" /></div>
                  <div className="space-y-1"><Label className="text-xs">Height</Label><Input type="number" min={1} value={form.mobileHeight} onChange={e => sf({ mobileHeight: e.target.value })} placeholder="auto" /></div>
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />Custom Override</p>
                  <div className="space-y-1"><Label className="text-xs">Width</Label><Input type="number" min={1} value={form.customWidth} onChange={e => sf({ customWidth: e.target.value })} placeholder="px" /></div>
                  <div className="space-y-1"><Label className="text-xs">Height</Label><Input type="number" min={1} value={form.customHeight} onChange={e => sf({ customHeight: e.target.value })} placeholder="px" /></div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Slider controls */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" />Slider Controls
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <Label className="flex items-center gap-1.5 cursor-pointer"><Play className="h-3.5 w-3.5" />Auto Play</Label>
                  <Switch checked={form.autoPlay} onCheckedChange={v => sf({ autoPlay: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <Label className="flex items-center gap-1.5 cursor-pointer">
                    <ChevronLeft className="h-3.5 w-3.5" /><ChevronRight className="h-3.5 w-3.5 -ml-2" />Show Arrows
                  </Label>
                  <Switch checked={form.showArrows} onCheckedChange={v => sf({ showArrows: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <Label className="flex items-center gap-1.5 cursor-pointer"><Circle className="h-3.5 w-3.5" />Show Dots</Label>
                  <Switch checked={form.showDots} onCheckedChange={v => sf({ showDots: v })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Slide Interval (ms)</Label>
                  <Input type="number" min={1000} step={500} value={form.slideInterval} onChange={e => sf({ slideInterval: e.target.value })} placeholder="5000" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Schedule & status */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Start Date &amp; Time</Label><Input type="datetime-local" value={form.startDate} onChange={e => sf({ startDate: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>End Date &amp; Time</Label><Input type="datetime-local" value={form.endDate} onChange={e => sf({ endDate: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <Label className="cursor-pointer">Active</Label>
                <Switch checked={form.isActive} onCheckedChange={v => sf({ isActive: v })} />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1">
                {editSlider ? "Update Slider" : "Create Slider"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
