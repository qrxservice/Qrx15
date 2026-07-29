import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyQueueDevices, useCreateQueueDevice, useUpdateQueueDevice, useDeleteQueueDevice, useGetDoctorProfile, QueueDisplayDevice } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Monitor, Tv, Smartphone, Tablet, MonitorSmartphone, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const displayTypes = [
  { value: "tv", label: "TV", icon: Tv, w: 1920, h: 1080 },
  { value: "monitor", label: "Monitor", icon: Monitor, w: 1366, h: 768 },
  { value: "mobile", label: "Mobile", icon: Smartphone, w: 390, h: 844 },
  { value: "tablet", label: "Tablet", icon: Tablet, w: 820, h: 1180 },
  { value: "custom", label: "Custom", icon: MonitorSmartphone, w: 1280, h: 720 },
];

const typeIcon: Record<string, typeof Tv> = {
  tv: Tv, monitor: Monitor, mobile: Smartphone, tablet: Tablet, custom: MonitorSmartphone,
};

type FormState = {
  name: string;
  displayType: string;
  width: string;
  height: string;
  fontSize: number;
  layoutSize: number;
  fullscreen: boolean;
  orientation: string;
  isActive: boolean;
  showPatientName: boolean;
  showDoctorName: boolean;
  voiceEnabled: boolean;
  voiceLanguage: string;
  theme: string;
};

const emptyForm: FormState = {
  name: "", displayType: "tv", width: "1920", height: "1080",
  fontSize: 100, layoutSize: 100, fullscreen: true, orientation: "landscape", isActive: true,
  showPatientName: true, showDoctorName: true, voiceEnabled: false, voiceLanguage: "en", theme: "dark",
};

export default function DoctorQueueDevicesPage() {
  const { toast } = useToast();
  const { data: profileData } = useGetDoctorProfile();
  const { data: devices, refetch } = useGetMyQueueDevices();
  const createDevice = useCreateQueueDevice();
  const updateDevice = useUpdateQueueDevice();
  const deleteDevice = useDeleteQueueDevice();

  const [showForm, setShowForm] = useState(false);
  const [editDevice, setEditDevice] = useState<QueueDisplayDevice | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const doctorId = profileData?.id ?? null;

  const resetForm = () => { setForm(emptyForm); setEditDevice(null); };

  const onTypeChange = (v: string) => {
    const preset = displayTypes.find(t => t.value === v);
    setForm(f => ({
      ...f,
      displayType: v,
      width: preset ? String(preset.w) : f.width,
      height: preset ? String(preset.h) : f.height,
      orientation: preset && (v === "mobile" || v === "tablet") ? "portrait" : f.orientation,
    }));
  };

  const buildPayload = () => ({
    name: form.name,
    displayType: form.displayType,
    width: form.width ? Number(form.width) : null,
    height: form.height ? Number(form.height) : null,
    fontSize: Number(form.fontSize),
    layoutSize: Number(form.layoutSize),
    fullscreen: form.fullscreen,
    orientation: form.orientation,
    isActive: form.isActive,
    showPatientName: form.showPatientName,
    showDoctorName: form.showDoctorName,
    voiceEnabled: form.voiceEnabled,
    voiceLanguage: form.voiceLanguage,
    theme: form.theme,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Device name is required", variant: "destructive" }); return; }
    try {
      if (editDevice) {
        await updateDevice.mutateAsync({ id: editDevice.id, data: buildPayload() });
        toast({ title: "Device updated" });
      } else {
        await createDevice.mutateAsync({ data: buildPayload() });
        toast({ title: "Device created" });
      }
      refetch();
      setShowForm(false);
      resetForm();
    } catch {
      toast({ title: "Failed to save device", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteDevice.mutateAsync({ id });
      toast({ title: "Device deleted" });
      refetch();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleEdit = (d: QueueDisplayDevice) => {
    setEditDevice(d);
    setForm({
      name: d.name,
      displayType: d.displayType,
      width: d.width != null ? String(d.width) : "",
      height: d.height != null ? String(d.height) : "",
      fontSize: d.fontSize ?? 100,
      layoutSize: d.layoutSize ?? 100,
      fullscreen: d.fullscreen ?? true,
      orientation: d.orientation ?? "landscape",
      isActive: d.isActive ?? true,
      showPatientName: d.showPatientName ?? true,
      showDoctorName: d.showDoctorName ?? true,
      voiceEnabled: d.voiceEnabled ?? false,
      voiceLanguage: d.voiceLanguage ?? "en",
      theme: d.theme ?? "dark",
    });
    setShowForm(true);
  };

  const displayUrl = (d: QueueDisplayDevice) => `/display/${d.id}`;

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Queue Display Devices</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage the screens that show your live queue in the chamber waiting area</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" />Add Device
          </Button>
        </div>

        {!devices?.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No display devices yet. Add one to configure your chamber front display.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {devices.map(d => {
              const Icon = typeIcon[d.displayType] || Monitor;
              return (
                <Card key={d.id} className={!d.isActive ? "opacity-60" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate">{d.name}</span>
                            {!d.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 capitalize">
                            {displayTypes.find(t => t.value === d.displayType)?.label || d.displayType} · {d.width ?? "auto"}×{d.height ?? "auto"} · {d.orientation}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Font {d.fontSize}% · Layout {d.layoutSize}% · {d.fullscreen ? "Fullscreen" : "Windowed"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <a href={displayUrl(d)} target="_blank" rel="noreferrer" className="mt-4 block">
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="mr-2 h-4 w-4" />Open Display
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); resetForm(); } else setShowForm(true); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDevice ? "Edit Display Device" : "Add Display Device"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Device Name *</Label>
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Waiting Room TV" />
            </div>
            <div className="space-y-2">
              <Label>Display Type</Label>
              <Select value={form.displayType} onValueChange={onTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {displayTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Width (px)</Label>
                <Input type="number" min={1} value={form.width} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} placeholder="1920" />
              </div>
              <div className="space-y-2">
                <Label>Height (px)</Label>
                <Input type="number" min={1} value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} placeholder="1080" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Font Size ({form.fontSize}%)</Label>
              <Input type="range" min={50} max={250} step={5} value={form.fontSize} onChange={e => setForm(f => ({ ...f, fontSize: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Layout Size ({form.layoutSize}%)</Label>
              <Input type="range" min={50} max={200} step={5} value={form.layoutSize} onChange={e => setForm(f => ({ ...f, layoutSize: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Orientation</Label>
              <Select value={form.orientation} onValueChange={v => setForm(f => ({ ...f, orientation: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Landscape</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="fullscreen">Fullscreen mode</Label>
              <Switch id="fullscreen" checked={form.fullscreen} onCheckedChange={v => setForm(f => ({ ...f, fullscreen: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch id="isActive" checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Display Content</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="showPatientName">Show patient name</Label>
                <Switch id="showPatientName" checked={form.showPatientName} onCheckedChange={v => setForm(f => ({ ...f, showPatientName: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showDoctorName">Show doctor name</Label>
                <Switch id="showDoctorName" checked={form.showDoctorName} onCheckedChange={v => setForm(f => ({ ...f, showDoctorName: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="voiceEnabled">Voice announcements</Label>
                <Switch id="voiceEnabled" checked={form.voiceEnabled} onCheckedChange={v => setForm(f => ({ ...f, voiceEnabled: v }))} />
              </div>
              {form.voiceEnabled && (
                <div className="space-y-2">
                  <Label>Announcement language</Label>
                  <Select value={form.voiceLanguage} onValueChange={v => setForm(f => ({ ...f, voiceLanguage: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={form.theme} onValueChange={v => setForm(f => ({ ...f, theme: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="teal">Teal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createDevice.isPending || updateDevice.isPending}>
              {editDevice ? "Update Device" : "Create Device"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
