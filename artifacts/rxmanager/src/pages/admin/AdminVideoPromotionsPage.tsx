import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListVideoPromotions, useCreateVideoPromotion, useUpdateVideoPromotion, useDeleteVideoPromotion,
  getListVideoPromotionsQueryKey,
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
import { Separator } from "@/components/ui/separator";
import { Video, Plus, Pencil, Trash2, Eye, EyeOff, Monitor, Smartphone, Play, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const POSITIONS = [
  { value: "homepage_hero",        label: "Homepage Hero (below hero section)" },
  { value: "homepage_middle",      label: "Homepage Middle (between sections)" },
  { value: "before_footer",        label: "Before Footer" },
  { value: "doctor_registration",  label: "Doctor Registration Section" },
];

interface VideoPromo {
  id: number;
  title: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  position: string;
  isActive: boolean;
  displayOrder: number;
  priority: number;
  desktopWidth?: number | null;
  desktopHeight?: number | null;
  mobileWidth?: number | null;
  mobileHeight?: number | null;
}

interface FormState {
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  position: string;
  isActive: boolean;
  displayOrder: string;
  priority: string;
  desktopWidth: string;
  desktopHeight: string;
  mobileWidth: string;
  mobileHeight: string;
}

const emptyForm: FormState = {
  title: "",
  videoUrl: "",
  thumbnailUrl: "",
  position: "homepage_hero",
  isActive: true,
  displayOrder: "0",
  priority: "0",
  desktopWidth: "",
  desktopHeight: "400",
  mobileWidth: "",
  mobileHeight: "220",
};

const posLabel = (v: string) => POSITIONS.find(p => p.value === v)?.label ?? v;

function detectKind(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/vimeo\.com/i.test(url)) return "Vimeo";
  if (/\.(mp4|webm|ogg)([?#]|$)/i.test(url)) return "Direct video";
  return "Embed";
}

export default function AdminVideoPromotionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data } = useListVideoPromotions({ all: "true" });
  const allPromos: VideoPromo[] = Array.isArray(data) ? (data as VideoPromo[]) : [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListVideoPromotionsQueryKey({ all: "true" }) });
  const createMut = useCreateVideoPromotion({ mutation: { onSuccess: invalidate } });
  const updateMut = useUpdateVideoPromotion({ mutation: { onSuccess: invalidate } });
  const deleteMut = useDeleteVideoPromotion({ mutation: { onSuccess: invalidate } });

  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<VideoPromo | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const sf = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const handleOpen = (promo?: VideoPromo) => {
    if (promo) {
      setEditing(promo);
      setForm({
        title: promo.title,
        videoUrl: promo.videoUrl ?? "",
        thumbnailUrl: promo.thumbnailUrl ?? "",
        position: promo.position,
        isActive: promo.isActive,
        displayOrder: String(promo.displayOrder),
        priority: String(promo.priority),
        desktopWidth: promo.desktopWidth?.toString() ?? "",
        desktopHeight: promo.desktopHeight?.toString() ?? "400",
        mobileWidth: promo.mobileWidth?.toString() ?? "",
        mobileHeight: promo.mobileHeight?.toString() ?? "220",
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toInt = (v: string) => v ? Number(v) : null;
    const payload = {
      title: form.title,
      videoUrl: form.videoUrl || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      position: form.position,
      isActive: form.isActive,
      displayOrder: Number(form.displayOrder) || 0,
      priority: Number(form.priority) || 0,
      desktopWidth: toInt(form.desktopWidth),
      desktopHeight: toInt(form.desktopHeight),
      mobileWidth: toInt(form.mobileWidth),
      mobileHeight: toInt(form.mobileHeight),
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: payload });
        toast({ title: "Video promotion updated" });
      } else {
        await createMut.mutateAsync({ data: payload });
        toast({ title: "Video promotion created" });
      }
      setDialog(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this video promotion?")) return;
    try {
      await deleteMut.mutateAsync({ id });
      toast({ title: "Deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleToggle = async (p: VideoPromo) => {
    try {
      await updateMut.mutateAsync({ id: p.id, data: { title: p.title, isActive: !p.isActive } });
      toast({ title: p.isActive ? "Hidden" : "Activated" });
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
              <Video className="h-6 w-6 text-primary" />
              Video Promotions
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Embed YouTube, Vimeo, or direct video files at key homepage positions
            </p>
          </div>
          <Button size="sm" onClick={() => handleOpen()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Add Video
          </Button>
        </div>

        {allPromos.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Video className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No video promotions yet. Add one to embed videos on the homepage.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPromos.map(p => (
              <Card key={p.id} className={!p.isActive ? "opacity-60" : ""}>
                {/* Thumbnail preview */}
                <div className="aspect-video bg-muted rounded-t-lg overflow-hidden relative flex items-center justify-center">
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                      <Video className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-12 w-12 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant={p.isActive ? "default" : "secondary"} className="text-xs">
                      {p.isActive ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-medium text-sm truncate">{p.title}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">{posLabel(p.position)}</Badge>
                    {p.videoUrl && (
                      <Badge variant="outline" className="text-xs">{detectKind(p.videoUrl)}</Badge>
                    )}
                    {p.desktopHeight && (
                      <Badge variant="outline" className="text-xs flex items-center gap-0.5">
                        <Monitor className="h-2.5 w-2.5" />{p.desktopWidth ? `${p.desktopWidth}×` : ""}{p.desktopHeight}px
                      </Badge>
                    )}
                    {p.mobileHeight && (
                      <Badge variant="outline" className="text-xs flex items-center gap-0.5">
                        <Smartphone className="h-2.5 w-2.5" />{p.mobileHeight}px
                      </Badge>
                    )}
                    {p.priority > 0 && <Badge variant="outline" className="text-xs">P{p.priority}</Badge>}
                  </div>

                  {p.videoUrl && (
                    <a href={p.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.videoUrl}</span>
                    </a>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpen(p)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      title={p.isActive ? "Hide" : "Activate"}
                      onClick={() => handleToggle(p)}
                    >
                      {p.isActive ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(p.id)}
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Video Promotion" : "Add Video Promotion"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">

            {/* Basic info */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input required value={form.title} onChange={e => sf({ title: e.target.value })} placeholder="Doctor Consultation Promo" />
              </div>
              <div className="space-y-1.5">
                <Label>Video URL</Label>
                <Input
                  type="url"
                  value={form.videoUrl}
                  onChange={e => sf({ videoUrl: e.target.value })}
                  placeholder="YouTube, Vimeo, or direct .mp4 URL"
                />
                {form.videoUrl && (
                  <p className="text-xs text-muted-foreground">
                    Detected: <span className="font-medium text-foreground">{detectKind(form.videoUrl)}</span>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Thumbnail URL</Label>
                <Input
                  type="url"
                  value={form.thumbnailUrl}
                  onChange={e => sf({ thumbnailUrl: e.target.value })}
                  placeholder="https://… (auto-detected for YouTube if blank)"
                />
                {form.thumbnailUrl && (
                  <img
                    src={form.thumbnailUrl}
                    alt="preview"
                    className="h-20 w-full object-cover rounded border mt-1"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
              </div>
            </div>

            <Separator />

            {/* Placement */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Placement</p>
              <div className="space-y-1.5">
                <Label>Position</Label>
                <Select value={form.position} onValueChange={v => sf({ position: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority (higher = first)</Label>
                  <Input type="number" value={form.priority} onChange={e => sf({ priority: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Display Order</Label>
                  <Input type="number" value={form.displayOrder} onChange={e => sf({ displayOrder: e.target.value })} placeholder="0" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Size */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Size (px)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" />Desktop</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Width (blank = full)</Label>
                    <Input type="number" min={100} value={form.desktopWidth} onChange={e => sf({ desktopWidth: e.target.value })} placeholder="auto" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Height</Label>
                    <Input type="number" min={100} value={form.desktopHeight} onChange={e => sf({ desktopHeight: e.target.value })} placeholder="400" />
                  </div>
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" />Mobile</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Width (blank = full)</Label>
                    <Input type="number" min={100} value={form.mobileWidth} onChange={e => sf({ mobileWidth: e.target.value })} placeholder="auto" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Height</Label>
                    <Input type="number" min={100} value={form.mobileHeight} onChange={e => sf({ mobileHeight: e.target.value })} placeholder="220" />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <Label className="cursor-pointer">Active</Label>
              <Switch checked={form.isActive} onCheckedChange={v => sf({ isActive: v })} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1">
                {editing ? "Update" : "Create"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
