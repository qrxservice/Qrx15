import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListConversations, useListChatMessages, useSendMessage, useDeleteMessage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MessageSquare, Send, Trash2, ShieldAlert, ArrowLeft, Paperclip, X, FileText, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { useUpload } from "@workspace/object-storage-web";
import { formatBytes, isImageType, MAX_UPLOAD_BYTES, downloadObject } from "@/lib/storage";
import { AuthedImage } from "@/components/AuthedImage";

function OnlineDot({ status }: { status: string | null | undefined }) {
  if (!status || status === "offline") return <span className="h-2 w-2 rounded-full bg-gray-400" />;
  if (status === "online") return <span className="h-2 w-2 rounded-full bg-green-500" />;
  if (status === "busy") return <span className="h-2 w-2 rounded-full bg-yellow-500" />;
  return <span className="h-2 w-2 rounded-full bg-orange-400" />;
}

export default function DoctorChatPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initConvId = params.get("conversationId") ? parseInt(params.get("conversationId")!) : null;

  const [selectedConvId, setSelectedConvId] = useState<number | null>(initConvId);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({ getAuthToken: () => localStorage.getItem("auth_token") });
  const [pending, setPending] = useState<{ objectPath: string; type: string; name: string; size: number; previewUrl: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: conversations, refetch: refetchConvs } = useListConversations({ query: { queryKey: ["conversations"], refetchInterval: 5000 } });
  const { data: messages, refetch: refetchMsgs } = useListChatMessages(
    selectedConvId ?? 0, {},
    { query: { queryKey: ["messages", selectedConvId], enabled: !!selectedConvId, refetchInterval: 3000 } }
  );
  const sendMsg = useSendMessage();
  const deleteMsg = useDeleteMessage();

  const selectedConv = conversations?.find(c => c.id === selectedConvId);

  useEffect(() => {
    if (initConvId && !selectedConvId) setSelectedConvId(initConvId);
  }, [initConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAttachSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }
    try {
      const res = await uploadFile(file);
      if (!res) throw new Error("upload failed");
      setPending({ objectPath: res.objectPath, type: file.type || "application/octet-stream", name: file.name, size: file.size, previewUrl: URL.createObjectURL(file) });
    } catch {
      toast({ title: "Failed to upload attachment", variant: "destructive" });
    }
  };

  const clearPending = () => {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !pending) || !selectedConvId) return;
    try {
      await sendMsg.mutateAsync({
        conversationId: selectedConvId,
        data: {
          message: message.trim() || null,
          attachmentUrl: pending?.objectPath ?? null,
          attachmentType: pending?.type ?? null,
          attachmentName: pending?.name ?? null,
          attachmentSize: pending?.size ?? null,
        },
      });
      setMessage("");
      clearPending();
      refetchMsgs();
      refetchConvs();
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  };

  const handleDelete = async (msgId: number) => {
    try {
      await deleteMsg.mutateAsync({ id: msgId });
      refetchMsgs();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const getDoctorId = () => {
    if (!user) return null;
    return (user as { doctorId?: number }).doctorId ?? null;
  };

  const myDoctorId = getDoctorId();

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-5xl mx-auto h-[calc(100vh-9rem)] sm:h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)]">
        <div className="flex h-full border rounded-xl overflow-hidden bg-background">
          {/* Conversations List */}
          <div className={cn("w-full md:w-72 border-r flex flex-col shrink-0 min-w-0", selectedConvId ? "hidden md:flex" : "flex")}>
            <div className="p-4 border-b">
              <h2 className="font-semibold">Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!conversations?.length ? (
                <div className="py-12 text-center px-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No conversations yet. Connect with colleagues to start chatting.</p>
                </div>
              ) : (
                conversations.map(conv => {
                  const other = conv.otherDoctor as { id?: number; name?: string; photoUrl?: string | null; onlineStatus?: string | null } | null;
                  const lastMsg = conv.lastMessage as { message?: string | null } | null;
                  return (
                    <button key={conv.id} onClick={() => setSelectedConvId(conv.id)}
                      className={cn("w-full text-left p-4 border-b hover:bg-muted/50 transition-colors flex items-start gap-3", selectedConvId === conv.id && "bg-muted")}>
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10 bg-primary/10">
                          <AvatarFallback className="text-primary text-sm">{other?.name?.charAt(0) || "D"}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5"><OnlineDot status={other?.onlineStatus} /></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium text-sm truncate">{other?.name || "Doctor"}</span>
                          {(conv.unreadCount ?? 0) > 0 && <Badge className="h-5 w-5 p-0 justify-center text-xs shrink-0">{conv.unreadCount}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg?.message || "No messages yet"}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Window */}
          {selectedConvId ? (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
                <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setSelectedConvId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const other = selectedConv?.otherDoctor as { name?: string; onlineStatus?: string | null } | null;
                  return (
                    <>
                      <Avatar className="h-8 w-8 bg-primary/10 shrink-0">
                        <AvatarFallback className="text-primary text-xs">{other?.name?.charAt(0) || "D"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{other?.name || "Doctor"}</p>
                        <div className="flex items-center gap-1.5">
                          <OnlineDot status={other?.onlineStatus} />
                          <span className="text-xs text-muted-foreground capitalize truncate">{other?.onlineStatus || "offline"}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Privacy Notice */}
              <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 border-amber-200 shrink-0">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700">
                  Do not share patient-identifying information without consent. Follow medical privacy rules.
                </AlertDescription>
              </Alert>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto min-w-0 p-3 sm:p-4 space-y-3">
                {messages?.map(msg => {
                  const isMe = msg.senderDoctorId === myDoctorId;
                  if (msg.isDeleted) return null;
                  return (
                    <div key={msg.id} className={cn("flex gap-2 group min-w-0", isMe && "flex-row-reverse")}>
                      <div className={cn("max-w-[85%] sm:max-w-xs lg:max-w-sm min-w-0", isMe && "items-end flex flex-col")}>
                        {msg.attachmentUrl && isImageType(msg.attachmentType) && (
                          <button
                            type="button"
                            onClick={() => setLightbox(msg.attachmentUrl ?? null)}
                            className="block mb-1 overflow-hidden rounded-2xl border"
                          >
                            <AuthedImage
                              path={msg.attachmentUrl}
                              alt={msg.attachmentName ?? "attachment"}
                              className="max-h-60 w-60 object-cover"
                            />
                          </button>
                        )}
                        {msg.attachmentUrl && !isImageType(msg.attachmentType) && (
                          <button
                            type="button"
                            onClick={() => downloadObject(msg.attachmentUrl, msg.attachmentName)}
                            className={cn("mb-1 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left", isMe ? "bg-primary/10" : "bg-muted")}
                          >
                            <FileText className="h-6 w-6 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{msg.attachmentName || "File"}</p>
                              <p className="text-xs text-muted-foreground">{formatBytes(msg.attachmentSize)}</p>
                            </div>
                            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        )}
                        {msg.message && (
                          <div className={cn("rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap", isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm")}>
                            {msg.message}
                          </div>
                        )}
                        <div className={cn("flex items-center gap-1 mt-1", isMe && "flex-row-reverse")}>
                          <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {isMe && (
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(msg.id)}>
                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t shrink-0">
                {(pending || isUploading) && (
                  <div className="px-4 pt-3">
                    {isUploading && !pending ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading attachment...
                      </div>
                    ) : pending ? (
                      <div className="inline-flex items-center gap-3 rounded-lg border bg-muted/50 p-2 pr-3">
                        {isImageType(pending.type) ? (
                          <img src={pending.previewUrl} alt={pending.name} className="h-12 w-12 rounded object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-background">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="max-w-[12rem] truncate text-sm font-medium">{pending.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(pending.size)}</p>
                        </div>
                        <button type="button" onClick={clearPending} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
                <form onSubmit={handleSend} className="p-3 sm:p-4 flex gap-2 min-w-0">
                  <input
                    ref={attachInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={handleAttachSelect}
                  />
                  <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={() => attachInputRef.current?.click()} disabled={isUploading || !!pending}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="flex-1 min-w-0"
                    autoComplete="off"
                  />
                  <Button type="submit" size="icon" className="shrink-0" disabled={(!message.trim() && !pending) || sendMsg.isPending || isUploading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 hidden md:flex items-center justify-center text-center p-8 min-w-0">
              <div>
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                <h3 className="font-semibold text-lg mb-2">Select a conversation</h3>
                <p className="text-muted-foreground text-sm">Choose a conversation from the left to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-3xl p-2">
          {lightbox && (
            <div className="flex flex-col gap-2">
              <AuthedImage path={lightbox} alt="attachment" className="max-h-[75vh] w-full rounded object-contain" />
              <Button variant="outline" size="sm" className="self-end" onClick={() => downloadObject(lightbox)}>
                <Download className="mr-2 h-4 w-4" />Download
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
