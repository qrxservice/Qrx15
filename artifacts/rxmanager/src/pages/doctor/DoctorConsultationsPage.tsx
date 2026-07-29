import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListConsultations,
  useCreateConsultation,
  useUpdateConsultation,
  useListFriends,
} from "@workspace/api-client-react";
import type { DoctorConsultationItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Stethoscope, Clock, CheckCircle2, XCircle, Plus, FileText,
  Paperclip, X, ArrowRight, Download, Loader2, ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";
import { useUpload } from "@workspace/object-storage-web";
import { formatBytes, isImageType, MAX_UPLOAD_BYTES, downloadObject } from "@/lib/storage";
import { AuthedImage } from "@/components/AuthedImage";

function StatusBadge({ status }: { status: string }) {
  if (status === "reviewed") return <Badge className="bg-green-50 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Reviewed</Badge>;
  if (status === "closed") return <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1"><XCircle className="h-3 w-3" />Closed</Badge>;
  return <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

function AttachmentView({ url, type, name, size }: { url: string; type?: string | null; name?: string | null; size?: number | null }) {
  if (isImageType(type)) {
    return (
      <button type="button" onClick={() => downloadObject(url, name)} className="block overflow-hidden rounded-lg border max-w-xs">
        <AuthedImage path={url} alt={name ?? "attachment"} className="max-h-32 w-full object-cover" />
      </button>
    );
  }
  return (
    <button type="button" onClick={() => downloadObject(url, name)} className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2 text-left max-w-xs">
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name || "File"}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(size)}</p>
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function ConsultationCard({
  item,
  perspective,
  onRespond,
}: {
  item: DoctorConsultationItem;
  perspective: "sent" | "received";
  onRespond?: (item: DoctorConsultationItem) => void;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="h-9 w-9 bg-primary/10 shrink-0">
              <AvatarFallback className="text-primary text-sm">{item.doctor?.name?.charAt(0) || "D"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {perspective === "sent" ? "To:" : "From:"} <span className="font-medium text-foreground">{item.doctor?.name || "Doctor"}</span>
                {item.doctor?.degree && <span className="text-muted-foreground"> · {item.doctor.degree}</span>}
              </p>
              {item.patientInfo && (
                <p className="text-xs text-muted-foreground mt-0.5">Patient: {item.patientInfo}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
              </p>
            </div>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Case Notes</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.caseNotes}</p>
        </div>

        {item.attachmentUrl && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Investigation Report</p>
            <AttachmentView url={item.attachmentUrl} type={item.attachmentType} name={item.attachmentName} size={item.attachmentSize} />
          </div>
        )}

        {item.responseNotes && (
          <div className="bg-green-50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-green-700">Second Opinion</p>
            <p className="text-sm text-green-800 whitespace-pre-wrap">{item.responseNotes}</p>
          </div>
        )}

        {perspective === "received" && item.status === "pending" && onRespond && (
          <Button size="sm" onClick={() => onRespond(item)}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Respond
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function DoctorConsultationsPage() {
  const { toast } = useToast();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initDoctorId = params.get("doctorId") ? parseInt(params.get("doctorId")!) : undefined;
  const initDoctorName = params.get("doctorName") || "";

  const [showForm, setShowForm] = useState(!!initDoctorId);
  const [respondItem, setRespondItem] = useState<DoctorConsultationItem | null>(null);
  const [responseNotes, setResponseNotes] = useState("");

  const [form, setForm] = useState({
    consultantDoctorId: initDoctorId ? String(initDoctorId) : "",
    patientInfo: "",
    caseNotes: "",
  });

  const attachInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({ getAuthToken: () => localStorage.getItem("auth_token") });
  const [pending, setPending] = useState<{ objectPath: string; type: string; name: string; size: number; previewUrl: string } | null>(null);

  const { data: consultations, refetch } = useListConsultations({ query: { queryKey: ["consultations"] } });
  const { data: friends } = useListFriends();
  const create = useCreateConsultation();
  const update = useUpdateConsultation();

  const handleAttachSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Maximum 5MB", variant: "destructive" });
      return;
    }
    try {
      const res = await uploadFile(file);
      if (!res) throw new Error("upload failed");
      setPending({ objectPath: res.objectPath, type: file.type || "application/octet-stream", name: file.name, size: file.size, previewUrl: URL.createObjectURL(file) });
    } catch {
      toast({ title: "Failed to upload", variant: "destructive" });
    }
  };

  const clearPending = () => { if (pending) URL.revokeObjectURL(pending.previewUrl); setPending(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consultantDoctorId || !form.caseNotes) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        data: {
          consultantDoctorId: parseInt(form.consultantDoctorId),
          patientInfo: form.patientInfo || undefined,
          caseNotes: form.caseNotes,
          attachmentUrl: pending?.objectPath ?? null,
          attachmentType: pending?.type ?? null,
          attachmentName: pending?.name ?? null,
          attachmentSize: pending?.size ?? null,
        },
      });
      toast({ title: "Consultation request sent" });
      setForm({ consultantDoctorId: "", patientInfo: "", caseNotes: "" });
      clearPending();
      setShowForm(false);
      refetch();
    } catch {
      toast({ title: "Failed to send request", variant: "destructive" });
    }
  };

  const handleRespond = async () => {
    if (!respondItem || !responseNotes.trim()) {
      toast({ title: "Please enter your response", variant: "destructive" });
      return;
    }
    try {
      await update.mutateAsync({ id: respondItem.id, data: { responseNotes: responseNotes.trim(), status: "reviewed" } });
      toast({ title: "Response sent" });
      setRespondItem(null);
      setResponseNotes("");
      refetch();
    } catch {
      toast({ title: "Failed to respond", variant: "destructive" });
    }
  };

  const sent = consultations?.sent ?? [];
  const received = consultations?.received ?? [];

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-primary" />Second Opinions
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Request specialist opinions from connected colleagues</p>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />New Request
          </Button>
        </div>

        {/* New Consultation Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />Request Second Opinion
              </DialogTitle>
            </DialogHeader>
            <Alert className="bg-amber-50 border-amber-200 mb-2">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <AlertDescription className="text-xs text-amber-700">
                Do not share patient-identifying information without consent.
              </AlertDescription>
            </Alert>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Consulting Doctor *</Label>
                <Select value={form.consultantDoctorId} onValueChange={v => setForm(f => ({ ...f, consultantDoctorId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a connected doctor">
                      {initDoctorName && form.consultantDoctorId === String(initDoctorId) ? initDoctorName : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {friends?.map(f => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.name}{f.degree ? ` — ${f.degree}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="patientInfo">Patient Info (de-identified)</Label>
                <Input id="patientInfo" placeholder="e.g. 45y Male, DM2, HTN" value={form.patientInfo} onChange={e => setForm(f => ({ ...f, patientInfo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caseNotes">Case Notes *</Label>
                <Textarea id="caseNotes" required rows={5} placeholder="Clinical history, findings, your assessment, question for the consultant..." value={form.caseNotes} onChange={e => setForm(f => ({ ...f, caseNotes: e.target.value }))} />
              </div>
              {/* Attachment */}
              <div className="space-y-1.5">
                <Label>Investigation Report (optional)</Label>
                <input ref={attachInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx" className="hidden" onChange={handleAttachSelect} />
                {!pending && !isUploading && (
                  <Button type="button" variant="outline" size="sm" onClick={() => attachInputRef.current?.click()}>
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" />Attach File
                  </Button>
                )}
                {isUploading && !pending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />Uploading...
                  </div>
                )}
                {pending && (
                  <div className="inline-flex items-center gap-3 rounded-lg border bg-muted/50 p-2 pr-3">
                    {isImageType(pending.type) ? (
                      <img src={pending.previewUrl} alt={pending.name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-background">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="max-w-[10rem] truncate text-sm font-medium">{pending.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(pending.size)}</p>
                    </div>
                    <button type="button" onClick={clearPending} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); clearPending(); }}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={create.isPending || isUploading}>
                  {create.isPending ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Respond Dialog */}
        <Dialog open={!!respondItem} onOpenChange={o => { if (!o) { setRespondItem(null); setResponseNotes(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Respond to Consultation</DialogTitle>
            </DialogHeader>
            {respondItem && (
              <div className="space-y-4 mt-2">
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">Case Notes from Dr. {respondItem.doctor?.name}</p>
                  <p className="text-muted-foreground whitespace-pre-wrap text-xs">{respondItem.caseNotes}</p>
                </div>
                {respondItem.attachmentUrl && (
                  <AttachmentView url={respondItem.attachmentUrl} type={respondItem.attachmentType} name={respondItem.attachmentName} size={respondItem.attachmentSize} />
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="responseNotes">Your Second Opinion *</Label>
                  <Textarea id="responseNotes" rows={5} required placeholder="Your clinical assessment and recommendations..." value={responseNotes} onChange={e => setResponseNotes(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setRespondItem(null); setResponseNotes(""); }}>Cancel</Button>
                  <Button className="flex-1" onClick={handleRespond} disabled={update.isPending || !responseNotes.trim()}>
                    {update.isPending ? "Sending..." : "Send Response"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Tabs */}
        <Tabs defaultValue={received.filter(r => r.status === "pending").length > 0 ? "received" : "sent"}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="sent">
              <ArrowRight className="h-3.5 w-3.5 mr-1.5" />Sent ({sent.length})
            </TabsTrigger>
            <TabsTrigger value="received">
              Received ({received.length})
              {received.filter(r => r.status === "pending").length > 0 && (
                <Badge className="ml-1.5 h-5 w-5 p-0 justify-center text-xs">{received.filter(r => r.status === "pending").length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="mt-4">
            {!sent.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Stethoscope className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>No consultation requests sent yet</p>
                <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}>Send First Request</Button>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {sent.map(item => <ConsultationCard key={item.id} item={item} perspective="sent" />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="received" className="mt-4">
            {!received.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <p>No consultation requests received yet</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {received.map(item => (
                  <ConsultationCard key={item.id} item={item} perspective="received" onRespond={setRespondItem} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
