import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyAvailability, useUpsertAvailability, useDeleteAvailability } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DoctorAvailabilityPage() {
  const { toast } = useToast();
  const { data: slots, refetch } = useGetMyAvailability();
  const upsert = useUpsertAvailability();
  const deleteSlot = useDeleteAvailability();

  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ dayOfWeek: 0, startTime: "09:00", endTime: "17:00", breakStart: "", breakEnd: "", maxAppointments: 20, isAvailable: true });

  const handleSave = async (dayOfWeek: number) => {
    try {
      await upsert.mutateAsync({ data: { ...form, dayOfWeek } });
      toast({ title: "Availability updated" });
      refetch();
      setEditing(null);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSlot.mutateAsync({ id });
      toast({ title: "Slot removed" });
      refetch();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const getSlotForDay = (day: number) => slots?.find(s => s.dayOfWeek === day);

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Availability Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">Set your weekly schedule so patients know when to book</p>
        </div>

        <div className="space-y-3">
          {DAYS.map((day, i) => {
            const slot = getSlotForDay(i);
            const isEdit = editing === i;
            return (
              <Card key={day}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-28">
                        <span className="font-medium text-sm">{day}</span>
                      </div>
                      {slot ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={slot.isAvailable ? "default" : "secondary"}>
                            {slot.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{slot.startTime} – {slot.endTime}</span>
                          {slot.breakStart && slot.breakEnd && (
                            <span className="text-xs text-muted-foreground">(Break: {slot.breakStart}–{slot.breakEnd})</span>
                          )}
                          <span className="text-xs text-muted-foreground">Max {slot.maxAppointments} appts</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not configured</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditing(i);
                        setForm(slot ? {
                          dayOfWeek: i, startTime: slot.startTime, endTime: slot.endTime,
                          breakStart: slot.breakStart ?? "", breakEnd: slot.breakEnd ?? "",
                          maxAppointments: slot.maxAppointments ?? 20, isAvailable: slot.isAvailable ?? true,
                        } : { dayOfWeek: i, startTime: "09:00", endTime: "17:00", breakStart: "", breakEnd: "", maxAppointments: 20, isAvailable: true });
                      }}>
                        <Clock className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                      {slot && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(slot.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEdit && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Available on {day}</Label>
                        <Switch checked={form.isAvailable} onCheckedChange={v => setForm(f => ({ ...f, isAvailable: v }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Break Start</Label>
                          <Input type="time" value={form.breakStart} onChange={e => setForm(f => ({ ...f, breakStart: e.target.value }))} placeholder="Optional" />
                        </div>
                        <div className="space-y-2">
                          <Label>Break End</Label>
                          <Input type="time" value={form.breakEnd} onChange={e => setForm(f => ({ ...f, breakEnd: e.target.value }))} placeholder="Optional" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Max Appointments Per Day</Label>
                        <Input type="number" min="1" max="100" value={form.maxAppointments} onChange={e => setForm(f => ({ ...f, maxAppointments: Number(e.target.value) }))} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(i)} disabled={upsert.isPending}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
