import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListReferrals,
  useCreateReferral,
  useUpdateReferralStatus,
  useListFriends,
} from "@workspace/api-client-react";
import type { PatientReferralItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, ArrowRight, Clock, CheckCircle2, XCircle, Plus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";

function StatusBadge({ status }: { status: string }) {
  if (status === "reviewed") return <Badge className="bg-green-50 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Reviewed</Badge>;
  if (status === "closed") return <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1"><XCircle className="h-3 w-3" />Closed</Badge>;
  return <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

function ReferralCard({
  referral,
  perspective,
  onStatusChange,
}: {
  referral: PatientReferralItem;
  perspective: "sent" | "received";
  onStatusChange?: (id: number, status: string) => void;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="h-9 w-9 bg-primary/10 shrink-0">
              <AvatarFallback className="text-primary text-sm">
                {referral.doctor?.name?.charAt(0) || "D"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {perspective === "sent" ? "To:" : "From:"} <span className="font-medium text-foreground">{referral.doctor?.name || "Doctor"}</span>
                {referral.doctor?.degree && <span className="text-muted-foreground"> · {referral.doctor.degree}</span>}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm">{referral.patientName}</span>
                {referral.patientPhone && <span className="text-xs text-muted-foreground">{referral.patientPhone}</span>}
                {referral.patientAge && <span className="text-xs text-muted-foreground">{referral.patientAge}y</span>}
                {referral.patientGender && <span className="text-xs text-muted-foreground">{referral.patientGender}</span>}
              </div>
              <p className="text-sm mt-1.5 text-muted-foreground">
                <span className="font-medium text-foreground">Reason:</span> {referral.referralReason}
              </p>
              {referral.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">{referral.notes}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                {referral.createdAt ? new Date(referral.createdAt).toLocaleDateString() : ""}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <StatusBadge status={referral.status} />
            {perspective === "received" && referral.status === "pending" && onStatusChange && (
              <div className="flex gap-1">
                <Button size="sm" className="h-7 text-xs" onClick={() => onStatusChange(referral.id, "reviewed")}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />Review
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(referral.id, "closed")}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DoctorReferralsPage() {
  const { toast } = useToast();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initDoctorId = params.get("doctorId") ? parseInt(params.get("doctorId")!) : undefined;
  const initDoctorName = params.get("doctorName") || "";

  const [showForm, setShowForm] = useState(!!initDoctorId);
  const [form, setForm] = useState({
    receiverDoctorId: initDoctorId ? String(initDoctorId) : "",
    patientName: "",
    patientPhone: "",
    patientAge: "",
    patientGender: "",
    referralReason: "",
    notes: "",
  });

  const { data: referrals, refetch } = useListReferrals({ query: { queryKey: ["referrals"] } });
  const { data: friends } = useListFriends();
  const createReferral = useCreateReferral();
  const updateStatus = useUpdateReferralStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.receiverDoctorId || !form.patientName || !form.referralReason) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    try {
      await createReferral.mutateAsync({
        data: {
          receiverDoctorId: parseInt(form.receiverDoctorId),
          patientName: form.patientName,
          patientPhone: form.patientPhone || undefined,
          patientAge: form.patientAge ? parseInt(form.patientAge) : undefined,
          patientGender: form.patientGender || undefined,
          referralReason: form.referralReason,
          notes: form.notes || undefined,
        },
      });
      toast({ title: "Patient referred successfully" });
      setForm({ receiverDoctorId: "", patientName: "", patientPhone: "", patientAge: "", patientGender: "", referralReason: "", notes: "" });
      setShowForm(false);
      refetch();
    } catch {
      toast({ title: "Failed to send referral", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status } });
      refetch();
      toast({ title: `Referral marked as ${status}` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const sentReferrals = referrals?.sent ?? [];
  const receivedReferrals = referrals?.received ?? [];

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />Patient Referrals
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Refer patients to connected colleagues</p>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />New Referral
          </Button>
        </div>

        {/* New Referral Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />Refer a Patient
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Refer To (Connected Doctor) *</Label>
                <Select value={form.receiverDoctorId} onValueChange={v => setForm(f => ({ ...f, receiverDoctorId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a connected doctor">
                      {initDoctorName && form.receiverDoctorId === String(initDoctorId) ? initDoctorName : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {friends?.map(f => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.name}{f.degree ? ` — ${f.degree}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!friends?.length && (
                  <p className="text-xs text-muted-foreground">You need connections to refer patients. Connect with doctors first.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="patientName">Patient Name *</Label>
                <Input id="patientName" required placeholder="Full name" value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="patientPhone">Phone</Label>
                  <Input id="patientPhone" placeholder="01711111111" value={form.patientPhone} onChange={e => setForm(f => ({ ...f, patientPhone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="patientAge">Age</Label>
                  <Input id="patientAge" type="number" min="1" max="120" placeholder="35" value={form.patientAge} onChange={e => setForm(f => ({ ...f, patientAge: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.patientGender} onValueChange={v => setForm(f => ({ ...f, patientGender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="referralReason">Referral Reason *</Label>
                <Textarea id="referralReason" required placeholder="Reason for referral..." rows={3} value={form.referralReason} onChange={e => setForm(f => ({ ...f, referralReason: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" placeholder="Additional clinical notes..." rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={createReferral.isPending}>
                  {createReferral.isPending ? "Sending..." : "Send Referral"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Tabs */}
        <Tabs defaultValue={receivedReferrals.length > 0 ? "received" : "sent"}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="sent">
              <ArrowRight className="h-3.5 w-3.5 mr-1.5" />Sent ({sentReferrals.length})
            </TabsTrigger>
            <TabsTrigger value="received">
              Received ({receivedReferrals.length})
              {receivedReferrals.filter(r => r.status === "pending").length > 0 && (
                <Badge className="ml-1.5 h-5 w-5 p-0 justify-center text-xs">{receivedReferrals.filter(r => r.status === "pending").length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="mt-4">
            {!sentReferrals.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Send className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>No referrals sent yet</p>
                <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}>Send First Referral</Button>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {sentReferrals.map(r => <ReferralCard key={r.id} referral={r} perspective="sent" />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="received" className="mt-4">
            {!receivedReferrals.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <p>No referrals received yet</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {receivedReferrals.map(r => (
                  <ReferralCard key={r.id} referral={r} perspective="received" onStatusChange={handleStatusChange} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
