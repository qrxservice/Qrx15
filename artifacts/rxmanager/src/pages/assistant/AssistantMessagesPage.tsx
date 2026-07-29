import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListConversations, useListChatMessages, useSendMessage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function dot(status: string | null | undefined) {
  if (!status || status === "offline") return "bg-gray-400";
  if (status === "online") return "bg-green-500";
  return "bg-yellow-400";
}

export default function AssistantMessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useListConversations({
    query: { queryKey: ["asst-conversations"], refetchInterval: 5000 },
  });
  const { data: messages, refetch: refetchMsgs } = useListChatMessages(
    selectedConvId ?? 0, {},
    { query: { queryKey: ["asst-messages", selectedConvId], enabled: !!selectedConvId, refetchInterval: 3000 } },
  );
  const sendMsg = useSendMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConv = (conversations as any[])?.find((c: any) => c.id === selectedConvId);
  const msgList: any[] = Array.isArray(messages) ? messages : [];
  const convList: any[] = Array.isArray(conversations) ? conversations : [];

  const send = async () => {
    if (!selectedConvId || !draft.trim()) return;
    try {
      await sendMsg.mutateAsync({ conversationId: selectedConvId, data: { message: draft.trim() } });
      setDraft("");
      refetchMsgs();
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout role="assistant">
      <div className="flex h-[calc(100vh-5rem)] gap-4">
        {/* Conversation list */}
        <Card className="w-72 shrink-0 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-primary" /> Messages
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {convList.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No conversations</p>
            )}
            {convList.map((conv: any) => {
              const other = conv.participants?.find((p: any) => p.userId !== user?.id);
              const isActive = conv.id === selectedConvId;
              return (
                <button
                  key={conv.id}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left",
                    isActive && "bg-primary/10 border-l-2 border-primary",
                  )}
                  onClick={() => setSelectedConvId(conv.id)}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {(other?.userName ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background", dot(other?.userStatus))} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{other?.userName ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{other?.userRole ?? ""}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge className="shrink-0 h-5 min-w-5 px-1 text-xs">{conv.unreadCount}</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Message pane */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {!selectedConvId ? (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a conversation to start messaging</p>
              </div>
            </CardContent>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b shrink-0">
                {(() => {
                  const other = selectedConv?.participants?.find((p: any) => p.userId !== user?.id);
                  return (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(other?.userName ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn("absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-background", dot(other?.userStatus))} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{other?.userName ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{other?.userRole}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgList.map((msg: any) => {
                  const mine = msg.senderUserId === user?.id;
                  return (
                    <div key={msg.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-xs rounded-2xl px-4 py-2 text-sm break-words",
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm",
                      )}>
                        {msg.content}
                        <div className={cn("text-[10px] mt-1", mine ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div className="p-3 border-t shrink-0 flex gap-2">
                <Input
                  className="flex-1 text-sm"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <Button size="icon" className="shrink-0" onClick={send} disabled={!draft.trim() || sendMsg.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
