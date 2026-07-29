import { useEffect, useRef, useState, useCallback } from "react";
import { useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { PatientLayout } from "@/components/layout/PatientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Droplets, Phone, CheckCircle, XCircle, Clock, Loader2, User,
  Send, MessageSquare, Trophy, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContactUser {
  id: number;
  name?: string | null;
  bloodGroup?: string | null;
  phone?: string | null;
}

interface BloodRequest {
  id: number;
  requesterId: number;
  donorId: number;
  bloodGroup: string;
  message: string | null;
  status: string;
  createdAt: string;
  conversationId?: number | null;
  contactUser?: ContactUser;
}

interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted")
    return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle className="h-3 w-3" />Accepted</Badge>;
  if (status === "rejected")
    return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  if (status === "completed")
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><Trophy className="h-3 w-3" />Completed</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

// ─── Inline Chat Panel ────────────────────────────────────────────────────────

function ChatPanel({ conversationId, currentUserId, token, apiBase }: {
  conversationId: number;
  currentUserId: number;
  token: string;
  apiBase: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/blood-conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, [conversationId, token, apiBase]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${apiBase}/api/blood-conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setText("");
      await fetchMessages();
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="flex flex-col h-72 border rounded-lg overflow-hidden bg-muted/20">
      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">
            No messages yet. Say hello! 👋
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map(msg => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-background border rounded-bl-sm"
                  )}>
                    <p>{msg.message}</p>
                    <p className={cn(
                      "text-[10px] mt-0.5 flex items-center gap-1",
                      isMine ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                    )}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {isMine && (
                        <span>{msg.isRead ? "✓✓" : "✓"}</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-2 flex gap-2 bg-background">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message… (Enter to send)"
          className="resize-none min-h-0 h-9 py-2 text-sm"
          rows={1}
        />
        <Button size="sm" onClick={sendMessage} disabled={sending || !text.trim()} className="shrink-0 h-9 px-3">
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({ req, role, token, apiBase, currentUserId, onRespond }: {
  req: BloodRequest;
  role: "donor" | "requester";
  token: string;
  apiBase: string;
  currentUserId: number;
  onRespond: () => void;
}) {
  const { toast } = useToast();
  const [responding, setResponding] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const doRespond = async (status: "accepted" | "rejected" | "completed") => {
    setResponding(true);
    try {
      const res = await fetch(`${apiBase}/api/blood-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      toast({
        title: status === "accepted" ? "✅ Request accepted! Chat is now open."
          : status === "rejected" ? "Request declined."
          : "🎉 Marked as completed!",
      });
      onRespond();
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally {
      setResponding(false);
    }
  };

  const peer = req.contactUser;
  const peerName = peer?.name ?? (role === "donor" ? "Requester" : "Donor");
  const hasChat = req.status === "accepted" && req.conversationId;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-0.5">
            <p className="font-medium text-sm">
              {role === "donor"
                ? <><span className="font-semibold">{peerName}</span> needs <span className="text-red-600 font-bold">{req.bloodGroup}</span> blood</>
                : <>Request for <span className="text-red-600 font-bold">{req.bloodGroup}</span> blood → <span className="font-semibold">{peerName}</span></>
              }
            </p>
            {req.message && <p className="text-xs text-muted-foreground italic">"{req.message}"</p>}
            <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</p>
          </div>
          <StatusBadge status={req.status} />
        </div>

        {/* Contact info (visible after acceptance) */}
        {req.status === "accepted" && peer?.phone && (
          <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-2.5 flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              {role === "donor" ? "Requester" : "Donor"} contact: {peer.phone}
            </span>
          </div>
        )}

        {/* Action buttons */}
        {role === "donor" && req.status === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" disabled={responding} onClick={() => doRespond("accepted")}
              className="gap-1.5 bg-green-600 hover:bg-green-700">
              {responding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Accept
            </Button>
            <Button size="sm" variant="outline" disabled={responding} onClick={() => doRespond("rejected")}
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
              <XCircle className="h-3.5 w-3.5" />Decline
            </Button>
          </div>
        )}

        {/* Chat toggle (accepted only) */}
        {hasChat && (
          <div className="space-y-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setShowChat(v => !v)}
              className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {showChat ? "Hide Chat" : "Open Chat"}
              {showChat ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>

            {showChat && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Private channel with {peerName} — discuss donation details, date, time, and location.
                </p>
                <ChatPanel
                  conversationId={req.conversationId!}
                  currentUserId={currentUserId}
                  token={token}
                  apiBase={apiBase}
                />
                {req.status === "accepted" && role === "requester" && (
                  <Button size="sm" variant="outline" onClick={() => doRespond("completed")} disabled={responding}
                    className="gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50">
                    <Trophy className="h-3.5 w-3.5" />Mark Donation Complete
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function Empty({ message, linkHref, linkLabel }: { message: string; linkHref?: string; linkLabel?: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center text-muted-foreground text-sm">
        {message}{" "}
        {linkHref && <a href={linkHref} className="text-primary underline">{linkLabel}</a>}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientBloodRequestsPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const search = useSearch();
  const tabParam = new URLSearchParams(search).get("tab") ?? "received";

  const [incoming, setIncoming] = useState<BloodRequest[]>([]);
  const [outgoing, setOutgoing] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/api/patient/blood-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
    } catch {
      toast({ title: "Failed to load blood requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, apiBase]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  // Refresh every 15 s so new requests appear without manual reload
  useEffect(() => {
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const pendingIncoming = incoming.filter(r => r.status === "pending");
  const acceptedAll = [
    ...outgoing.filter(r => r.status === "accepted"),
    ...incoming.filter(r => r.status === "accepted"),
  ];
  const completed = [
    ...outgoing.filter(r => r.status === "completed"),
    ...incoming.filter(r => r.status === "completed"),
  ];

  if (loading) return (
    <PatientLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </PatientLayout>
  );

  return (
    <PatientLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Droplets className="h-6 w-6 text-red-500" />Blood Requests
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your blood donation requests. After acceptance, a private chat opens to arrange the details.
          </p>
        </div>

        <Tabs defaultValue={["received","sent","accepted","completed"].includes(tabParam) ? tabParam : "received"}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="received" className="relative text-xs sm:text-sm">
              Received
              {pendingIncoming.length > 0 && (
                <span className="ml-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingIncoming.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="text-xs sm:text-sm">Sent</TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs sm:text-sm">
              Accepted
              {acceptedAll.length > 0 && (
                <span className="ml-1.5 h-4 w-4 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {acceptedAll.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">Done</TabsTrigger>
          </TabsList>

          {/* ── Received (as donor) ── */}
          <TabsContent value="received" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" />Blood requests sent to you as a donor
            </p>
            {incoming.length === 0 ? (
              <Empty
                message="No incoming blood requests."
                linkHref="/patient/profile"
                linkLabel="Enable donor status to receive requests."
              />
            ) : (
              incoming.map(req => (
                <RequestCard key={req.id} req={req} role="donor"
                  token={token!} apiBase={apiBase} currentUserId={user!.id}
                  onRespond={fetchRequests} />
              ))
            )}
          </TabsContent>

          {/* ── Sent (as requester) ── */}
          <TabsContent value="sent" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Send className="h-3.5 w-3.5" />Requests you sent to donors
            </p>
            {outgoing.length === 0 ? (
              <Empty
                message="You haven't sent any blood requests yet."
                linkHref="/blood-donors"
                linkLabel="Find a donor →"
              />
            ) : (
              outgoing.map(req => (
                <RequestCard key={req.id} req={req} role="requester"
                  token={token!} apiBase={apiBase} currentUserId={user!.id}
                  onRespond={fetchRequests} />
              ))
            )}
          </TabsContent>

          {/* ── Accepted — with chat ── */}
          <TabsContent value="accepted" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />Accepted requests — open chat to arrange donation details
            </p>
            {acceptedAll.length === 0 ? (
              <Empty message="No accepted requests yet." />
            ) : (
              acceptedAll.map(req => {
                const role = req.donorId === user!.id ? "donor" : "requester";
                return (
                  <RequestCard key={`${role}-${req.id}`} req={req} role={role}
                    token={token!} apiBase={apiBase} currentUserId={user!.id}
                    onRespond={fetchRequests} />
                );
              })
            )}
          </TabsContent>

          {/* ── Completed ── */}
          <TabsContent value="completed" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />Completed donations — thank you for saving lives! 🎉
            </p>
            {completed.length === 0 ? (
              <Empty message="No completed donations yet." />
            ) : (
              completed.map(req => {
                const role = req.donorId === user!.id ? "donor" : "requester";
                return (
                  <RequestCard key={`${role}-${req.id}`} req={req} role={role}
                    token={token!} apiBase={apiBase} currentUserId={user!.id}
                    onRespond={fetchRequests} />
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PatientLayout>
  );
}
