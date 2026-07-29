import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyNotices, useCreateNotice, useUpdateNotice, useDeleteNotice, DoctorNotice } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const noticeTypes = [
  { value: "general", label: "General Notice" },
  { value: "vacation", label: "Vacation" },
  { value: "chamber_closed", label: "Chamber Closed" },
  { value: "emergency_unavailable", label: "Emergency Unavailable" },
  { value: "special_schedule", label: "Special Schedule" },
];

const typeColors: Record<string, string> = {
  vacation: "bg-orange-100 text-orange-700",
  chamber_closed: "bg-red-100 text-red-700",
  emergency_unavailable: "bg-red-100 text-red-700",
  special_schedule: "bg-blue-100 text-blue-700",
  general: "bg-gray-100 text-gray-700",
};

export default function DoctorNoticesPage() {
  const { toast } = useToast();
  const { data: notices, refetch } = useGetMyNotices();
  const createNotice = useCreateNotice();
  const updateNotice = useUpdateNotice();
  const deleteNotice = useDeleteNotice();

  const [showForm, setShowForm] = useState(false);
  const [editNotice, setEditNotice] = useState<DoctorNotice | null>(null);
  const [form, setForm] = useState({ title: "", message: "", type: "general", fromDate: "", toDate: "", fromTime: "", toTime: "", isActive: true });

  const resetForm = () => { setForm({ title: "", message: "", type: "general", fromDate: "", toDate: "", fromTime: "", toTime: "", isActive: true }); setEditNotice(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editNotice) {
        await updateNotice.mutateAsync({ id: editNotice.id, data: form });
        toast({ title: "Notice updated" });
      } else {
        await createNotice.mutateAsync({ data: form });
        toast({ title: "Notice created" });
      }
      refetch();
      setShowForm(false);
      resetForm();
    } catch {
      toast({ title: "Failed to save notice", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotice.mutateAsync({ id });
      toast({ title: "Notice deleted" });
      refetch();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleEdit = (notice: DoctorNotice) => {
    setEditNotice(notice);
    setForm({
      title: notice.title, message: notice.message, type: notice.type,
      fromDate: notice.fromDate ?? "", toDate: notice.toDate ?? "",
      fromTime: notice.fromTime ?? "", toTime: notice.toTime ?? "", isActive: notice.isActive ?? true,
    });
    setShowForm(true);
  };

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notices</h1>
            <p className="text-muted-foreground text-sm mt-1">Inform patients about vacation, schedule changes, or important updates</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" />New Notice
          </Button>
        </div>

        {!notices?.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No notices yet. Create one to inform your patients.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notices.map(notice => (
              <Card key={notice.id} className={!notice.isActive ? "opacity-60" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold">{notice.title}</span>
                        <Badge className={typeColors[notice.type] || typeColors.general}>
                          {noticeTypes.find(t => t.value === notice.type)?.label || notice.type}
                        </Badge>
                        {!notice.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{notice.message}</p>
                      {notice.fromDate && notice.toDate && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {notice.fromDate} to {notice.toDate}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(notice)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(notice.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); resetForm(); } else setShowForm(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editNotice ? "Edit Notice" : "Create Notice"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Notice Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {noticeTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Vacation Notice" />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea required rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Dr. Ahmed will be unavailable from..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input type="date" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input type="date" value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>From Time</Label>
                <Input type="time" value={form.fromTime} onChange={e => setForm(f => ({ ...f, fromTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>To Time</Label>
                <Input type="time" value={form.toTime} onChange={e => setForm(f => ({ ...f, toTime: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">Leave times empty for an all-day notice. For vacations, booking is blocked during this window.</p>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active (visible to patients)</Label>
              <Switch id="isActive" checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
            <Button type="submit" className="w-full" disabled={createNotice.isPending || updateNotice.isPending}>
              {editNotice ? "Update Notice" : "Create Notice"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
