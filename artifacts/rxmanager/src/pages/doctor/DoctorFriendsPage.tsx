import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListFriends, useListFriendRequests, useAcceptFriendRequest, useRejectFriendRequest, useListDoctors, useSendFriendRequest, useCreateConversation } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, UserPlus, Search, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function OnlineDot({ status }: { status: string | null | undefined }) {
  if (!status || status === "offline") return <span className="h-2.5 w-2.5 rounded-full bg-gray-400 border border-white" />;
  if (status === "online") return <span className="h-2.5 w-2.5 rounded-full bg-green-500 border border-white" />;
  if (status === "busy") return <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 border border-white" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-orange-400 border border-white" />;
}

export default function DoctorFriendsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: friends, refetch: refetchFriends } = useListFriends();
  const { data: requests, refetch: refetchRequests } = useListFriendRequests();
  const { data: allDoctors } = useListDoctors({ search: search || undefined, limit: 10 }, { query: { queryKey: ["doctorSearch", search], enabled: search.length > 1 } });

  const accept = useAcceptFriendRequest();
  const reject = useRejectFriendRequest();
  const sendReq = useSendFriendRequest();
  const createConv = useCreateConversation();

  const receivedCount = requests?.received?.length ?? 0;

  const handleAccept = async (id: number) => {
    try { await accept.mutateAsync({ id }); refetchRequests(); refetchFriends(); toast({ title: "Friend request accepted" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleReject = async (id: number) => {
    try { await reject.mutateAsync({ id }); refetchRequests(); toast({ title: "Request declined" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleSendRequest = async (doctorId: number) => {
    try { await sendReq.mutateAsync({ id: doctorId }); toast({ title: "Friend request sent" }); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast({ title: err?.response?.data?.error || "Failed to send request", variant: "destructive" });
    }
  };

  const handleOpenChat = async (friendId: number) => {
    try {
      const conv = await createConv.mutateAsync({ data: { otherDoctorId: friendId } });
      setLocation(`/doctor/chat?conversationId=${conv.id}`);
    } catch { toast({ title: "Failed to open chat", variant: "destructive" }); }
  };

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Doctor Network</h1>
          <p className="text-muted-foreground text-sm mt-1">Connect with colleagues for professional collaboration and referrals</p>
        </div>

        <Tabs defaultValue="friends">
          <TabsList>
            <TabsTrigger value="friends">Friends ({friends?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {receivedCount > 0 && <Badge className="ml-1.5 h-5 w-5 p-0 justify-center text-xs">{receivedCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="search">Find Doctors</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4">
            {!friends?.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><UserCheck className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No connections yet. Search for doctors to connect.</p></CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {friends.map(f => (
                  <Card key={f.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 bg-primary/10">
                            <AvatarFallback className="text-primary font-semibold">{f.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5"><OnlineDot status={f.onlineStatus} /></div>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{f.name}</p>
                          {f.degree && <p className="text-xs text-muted-foreground">{f.degree}</p>}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleOpenChat(f.id)}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />Message
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4">
            {!requests?.received?.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No pending friend requests</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {requests.received.map((r: { id: number; requesterDoctorId: number; doctor?: { id: number; name: string; degree?: string | null } | null }) => (
                  <Card key={r.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-primary/10">
                          <AvatarFallback className="text-primary">{r.doctor?.name?.charAt(0) || "D"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{r.doctor?.name || "Doctor"}</p>
                          {r.doctor?.degree && <p className="text-xs text-muted-foreground">{r.doctor.degree}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAccept(r.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Accept
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleReject(r.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" />Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search doctors by name..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {search.length > 1 && (
                <div className="space-y-2">
                  {allDoctors?.doctors?.map(doc => (
                    <Card key={doc.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-primary/10">
                            <AvatarFallback className="text-primary">{doc.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{doc.degree}{doc.departmentName ? ` · ${doc.departmentName}` : ""}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleSendRequest(doc.id)}>
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />Connect
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {allDoctors?.doctors?.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No doctors found</p>}
                </div>
              )}
              {search.length <= 1 && <p className="text-center text-muted-foreground text-sm py-4">Type 2+ characters to search</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
