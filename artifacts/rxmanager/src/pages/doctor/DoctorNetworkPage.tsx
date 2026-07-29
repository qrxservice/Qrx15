import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListFriends,
  useListFriendRequests,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useCancelFriendRequest,
  useListDoctors,
  useSendFriendRequest,
  useCreateConversation,
  useGetConnectionStatus,
  useGetNetworkStats,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  UserCheck, UserPlus, Search, MessageSquare, CheckCircle2, XCircle,
  Users, Clock, Send, ArrowRight, ClipboardList, Stethoscope,
  X, Network,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { storageUrl } from "@/lib/storage";
import { useListSpecialties, useListCountries, useListCities } from "@workspace/api-client-react";

function OnlineDot({ status }: { status: string | null | undefined }) {
  if (!status || status === "offline") return <span className="h-2.5 w-2.5 rounded-full bg-gray-400 border-2 border-white" />;
  if (status === "online") return <span className="h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />;
  if (status === "busy") return <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 border-2 border-white" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-orange-400 border-2 border-white" />;
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-blue-700 font-medium">
      <span className="text-xs leading-none">✅</span>Verified
    </span>
  );
}

function StatCard({ label, value, color = "text-primary" }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-3">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

// Component that shows real-time connection status for a doctor in the directory
function DoctorDirectoryCard({
  doc,
  onConnect,
  onMessage,
  onRefer,
  onConsult,
}: {
  doc: {
    id: number;
    name: string;
    degree?: string | null;
    photoUrl?: string | null;
    specialtyName?: string | null;
    departmentName?: string | null;
    experience?: number | null;
    chamberAddress?: string | null;
    countryName?: string | null;
    cityName?: string | null;
    isVerified?: boolean | null;
  };
  onConnect: (id: number) => void;
  onMessage: (id: number) => void;
  onRefer: (id: number, name: string) => void;
  onConsult: (id: number, name: string) => void;
}) {
  const { data: status, refetch } = useGetConnectionStatus(doc.id, {
    query: { queryKey: ["connection-status", doc.id] },
  });

  const handleConnect = () => {
    onConnect(doc.id);
    setTimeout(() => refetch(), 800);
  };

  const isAccepted = status?.status === "accepted";
  const isPendingSent = status?.status === "pending_sent";
  const isPendingReceived = status?.status === "pending_received";

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 bg-primary/10 shrink-0">
            {storageUrl(doc.photoUrl) && <AvatarImage src={storageUrl(doc.photoUrl)!} alt={doc.name} />}
            <AvatarFallback className="text-primary font-semibold">{doc.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-sm">{doc.name}</span>
              {doc.isVerified && <VerifiedBadge />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{doc.degree}</p>
            {(doc.specialtyName || doc.departmentName) && (
              <p className="text-xs text-muted-foreground truncate">{doc.specialtyName || doc.departmentName}</p>
            )}
            {(doc.cityName || doc.countryName) && (
              <p className="text-xs text-muted-foreground truncate">{[doc.cityName, doc.countryName].filter(Boolean).join(", ")}</p>
            )}
            {doc.experience != null && (
              <p className="text-xs text-muted-foreground">{doc.experience} yrs exp</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {isAccepted ? (
            <>
              <Badge className="bg-green-50 text-green-700 border-green-200 gap-1">
                <UserCheck className="h-3 w-3" />Connected
              </Badge>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onMessage(doc.id)}>
                <MessageSquare className="h-3 w-3 mr-1" />Message
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onRefer(doc.id, doc.name)}>
                <Send className="h-3 w-3 mr-1" />Refer Patient
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onConsult(doc.id, doc.name)}>
                <Stethoscope className="h-3 w-3 mr-1" />Consult
              </Button>
            </>
          ) : isPendingSent ? (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
              <Clock className="h-3 w-3" />Pending
            </Badge>
          ) : isPendingReceived ? (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
              <ArrowRight className="h-3 w-3" />Respond
            </Badge>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleConnect}>
              <UserPlus className="h-3 w-3 mr-1" />Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DoctorNetworkPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("");
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterExpMin, setFilterExpMin] = useState<string>("");

  // Referral dialog state
  const [referDialog, setReferDialog] = useState<{ doctorId: number; doctorName: string } | null>(null);
  const [consultDialog, setConsultDialog] = useState<{ doctorId: number; doctorName: string } | null>(null);

  const { data: stats, refetch: refetchStats } = useGetNetworkStats({ query: { queryKey: ["network-stats"], refetchInterval: 15000 } });
  const { data: friends, refetch: refetchFriends } = useListFriends();
  const { data: requests, refetch: refetchRequests } = useListFriendRequests();
  const { data: specialties } = useListSpecialties(undefined, { query: { queryKey: ["specialties"] } });
  const { data: countries } = useListCountries({ query: { queryKey: ["countries"] } });
  const { data: cities } = useListCities(
    filterCountry ? { countryId: parseInt(filterCountry) } : undefined,
    { query: { queryKey: ["cities", filterCountry], enabled: !!filterCountry } }
  );

  const queryEnabled = search.length > 1 || !!filterSpecialty || !!filterCountry || !!filterCity;
  const { data: allDoctors } = useListDoctors(
    {
      search: search || undefined,
      specialtyId: filterSpecialty ? parseInt(filterSpecialty) : undefined,
      countryId: filterCountry ? parseInt(filterCountry) : undefined,
      cityId: filterCity ? parseInt(filterCity) : undefined,
      limit: 20,
    },
    { query: { queryKey: ["doctorSearch", search, filterSpecialty, filterCountry, filterCity], enabled: queryEnabled } }
  );

  const accept = useAcceptFriendRequest();
  const reject = useRejectFriendRequest();
  const cancel = useCancelFriendRequest();
  const sendReq = useSendFriendRequest();
  const createConv = useCreateConversation();

  const receivedCount = requests?.received?.length ?? 0;

  const refetchAll = () => { refetchFriends(); refetchRequests(); refetchStats(); };

  const handleAccept = async (id: number) => {
    try { await accept.mutateAsync({ id }); refetchAll(); toast({ title: "Connection accepted" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleReject = async (id: number) => {
    try { await reject.mutateAsync({ id }); refetchAll(); toast({ title: "Request declined" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleCancel = async (id: number) => {
    try { await cancel.mutateAsync({ id }); refetchAll(); toast({ title: "Request cancelled" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleSendRequest = async (doctorId: number) => {
    try { await sendReq.mutateAsync({ id: doctorId }); refetchAll(); toast({ title: "Connection request sent" }); }
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

  // Filter doctors by min experience client-side (backend doesn't have this filter yet)
  const filteredDoctors = (allDoctors?.doctors ?? []).filter(d => {
    if (filterExpMin && (d.experience == null || d.experience < parseInt(filterExpMin))) return false;
    return true;
  });

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              Doctor Network
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Connect, collaborate, refer, and consult with colleagues</p>
          </div>
        </div>

        {/* Network Stats Dashboard */}
        {stats && (
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-4 sm:grid-cols-4 divide-x">
                <StatCard label="Connections" value={stats.totalConnections} color="text-primary" />
                <StatCard label="Pending" value={stats.pendingRequestsReceived} color="text-amber-600" />
                <StatCard label="Referrals Sent" value={stats.referralsSent} color="text-green-600" />
                <StatCard label="Unread" value={stats.unreadMessages} color="text-blue-600" />
              </div>
              <Separator />
              <div className="grid grid-cols-3 divide-x">
                <StatCard label="Referrals Received" value={stats.referralsReceived} color="text-green-700" />
                <StatCard label="Opinions Sent" value={stats.consultationsSent} color="text-purple-600" />
                <StatCard label="Opinions Pending" value={stats.consultationsPending} color="text-orange-600" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button variant="outline" className="h-14 flex-col gap-1 text-xs" onClick={() => setLocation("/doctor/referrals")}>
            <Send className="h-4 w-4 text-green-600" />Refer Patient
          </Button>
          <Button variant="outline" className="h-14 flex-col gap-1 text-xs" onClick={() => setLocation("/doctor/consultations")}>
            <Stethoscope className="h-4 w-4 text-purple-600" />Request Opinion
          </Button>
          <Button variant="outline" className="h-14 flex-col gap-1 text-xs" onClick={() => setLocation("/doctor/chat")}>
            <MessageSquare className="h-4 w-4 text-blue-600" />Messages
            {stats && stats.unreadMessages > 0 && (
              <Badge className="h-4 text-xs px-1 bg-blue-600">{stats.unreadMessages}</Badge>
            )}
          </Button>
          <Button variant="outline" className="h-14 flex-col gap-1 text-xs" onClick={() => setLocation("/doctor/referrals")}>
            <ClipboardList className="h-4 w-4 text-orange-600" />My Referrals
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="connections">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="connections">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              My Network ({friends?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {receivedCount > 0 && <Badge className="ml-1.5 h-5 w-5 p-0 justify-center text-xs bg-primary">{receivedCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="find">
              <Search className="h-3.5 w-3.5 mr-1.5" />Find Doctors
            </TabsTrigger>
          </TabsList>

          {/* ── My Network ── */}
          <TabsContent value="connections" className="mt-4">
            {!friends?.length ? (
              <Card>
                <CardContent className="py-14 text-center text-muted-foreground">
                  <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No connections yet</p>
                  <p className="text-sm mt-1">Search for doctors to connect and collaborate</p>
                  <Button variant="outline" className="mt-4" size="sm" onClick={() => document.querySelector<HTMLButtonElement>('[data-state][value="find"]')?.click()}>
                    Find Doctors
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {friends.map(f => (
                  <Card key={f.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 bg-primary/10">
                            <AvatarFallback className="text-primary font-semibold">{f.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5"><OnlineDot status={f.onlineStatus} /></div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm">{f.name}</p>
                            {(f as { isVerified?: boolean }).isVerified && <VerifiedBadge />}
                          </div>
                          {f.degree && <p className="text-xs text-muted-foreground">{f.degree}</p>}
                          {(f as { specialtyName?: string }).specialtyName && (
                            <p className="text-xs text-muted-foreground">{(f as { specialtyName?: string }).specialtyName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => handleOpenChat(f.id)}>
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />Message
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setLocation(`/doctor/referrals?doctorId=${f.id}&doctorName=${encodeURIComponent(f.name)}`)}>
                          <Send className="h-3.5 w-3.5 mr-1" />Refer
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setLocation(`/doctor/consultations?doctorId=${f.id}&doctorName=${encodeURIComponent(f.name)}`)}>
                          <Stethoscope className="h-3.5 w-3.5 mr-1" />Consult
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Requests ── */}
          <TabsContent value="requests" className="mt-4 space-y-6">
            {/* Received */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                Received ({requests?.received?.length ?? 0})
              </h3>
              {!requests?.received?.length ? (
                <p className="text-sm text-muted-foreground py-3">No pending requests</p>
              ) : (
                <div className="space-y-2">
                  {requests.received.map((r: { id: number; requesterDoctorId: number; doctor?: { id: number; name: string; degree?: string | null; isVerified?: boolean } | null }) => (
                    <Card key={r.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-primary/10">
                            <AvatarFallback className="text-primary">{r.doctor?.name?.charAt(0) || "D"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm">{r.doctor?.name || "Doctor"}</p>
                              {r.doctor?.isVerified && <VerifiedBadge />}
                            </div>
                            {r.doctor?.degree && <p className="text-xs text-muted-foreground">{r.doctor.degree}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAccept(r.id)} disabled={accept.isPending}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Accept
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleReject(r.id)} disabled={reject.isPending}>
                            <XCircle className="h-3.5 w-3.5 mr-1" />Decline
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Sent */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                Sent ({requests?.sent?.length ?? 0})
              </h3>
              {!requests?.sent?.length ? (
                <p className="text-sm text-muted-foreground py-3">No sent requests</p>
              ) : (
                <div className="space-y-2">
                  {(requests.sent as { id: number; receiverDoctorId: number; status: string }[]).map(r => (
                    <Card key={r.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-amber-50">
                            <AvatarFallback className="text-amber-700">D</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">Doctor #{r.receiverDoctorId}</p>
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-xs mt-0.5">
                              <Clock className="h-3 w-3" />Pending
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="text-destructive h-8" onClick={() => handleCancel(r.id)} disabled={cancel.isPending}>
                          <X className="h-3.5 w-3.5 mr-1" />Cancel
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Find Doctors ── */}
          <TabsContent value="find" className="mt-4">
            {/* Filters */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Specialties</SelectItem>
                    {(specialties as Array<{ id: number; name: string }> | undefined)?.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCountry} onValueChange={v => { setFilterCountry(v); setFilterCity(""); }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Countries</SelectItem>
                    {(countries as Array<{ id: number; name: string }> | undefined)?.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCity} onValueChange={setFilterCity} disabled={!filterCountry}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Division/City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Cities</SelectItem>
                    {(cities as Array<{ id: number; name: string }> | undefined)?.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterExpMin} onValueChange={setFilterExpMin}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Experience</SelectItem>
                    <SelectItem value="1">1+ years</SelectItem>
                    <SelectItem value="5">5+ years</SelectItem>
                    <SelectItem value="10">10+ years</SelectItem>
                    <SelectItem value="15">15+ years</SelectItem>
                    <SelectItem value="20">20+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!queryEnabled ? (
              <div className="text-center py-10 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Enter a name or apply a filter to find doctors</p>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No doctors found</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredDoctors.map(doc => (
                  <DoctorDirectoryCard
                    key={doc.id}
                    doc={doc}
                    onConnect={handleSendRequest}
                    onMessage={handleOpenChat}
                    onRefer={(id, name) => setLocation(`/doctor/referrals?doctorId=${id}&doctorName=${encodeURIComponent(name)}`)}
                    onConsult={(id, name) => setLocation(`/doctor/consultations?doctorId=${id}&doctorName=${encodeURIComponent(name)}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Unused state to suppress lint (kept for potential inline dialogs) */}
      {referDialog && null}
      {consultDialog && null}
    </DashboardLayout>
  );
}
