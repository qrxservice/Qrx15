import { useState } from "react";
import { useListAllDoctors, useApproveDoctor, useRejectDoctor, useFeatureDoctor, useMarkSeniorDoctor } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Star, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
};

const SUB_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  free: "outline",
  unpaid: "secondary",
  expired: "destructive",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminDoctorsPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [registrationDateFrom, setRegistrationDateFrom] = useState("");
  const [registrationDateTo, setRegistrationDateTo] = useState("");
  const [bmdcNumber, setBmdcNumber] = useState("");
  const [page, setPage] = useState(1);

  const { data, refetch } = useListAllDoctors({
    status: status && status !== "all" ? status : undefined,
    name: name || undefined,
    subscriptionStatus: subscriptionStatus && subscriptionStatus !== "all" ? subscriptionStatus : undefined,
    registrationDateFrom: registrationDateFrom || undefined,
    registrationDateTo: registrationDateTo || undefined,
    bmdcNumber: bmdcNumber || undefined,
    page,
    limit: 20,
  });

  const approve = useApproveDoctor();
  const reject = useRejectDoctor();
  const feature = useFeatureDoctor();
  const markSenior = useMarkSeniorDoctor();

  const handleApprove = async (id: number) => {
    try { await approve.mutateAsync({ id }); toast({ title: "Doctor approved" }); refetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleReject = async (id: number) => {
    try { await reject.mutateAsync({ id }); toast({ title: "Doctor rejected" }); refetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleFeature = async (id: number, isFeatured: boolean) => {
    try { await feature.mutateAsync({ id, data: { isFeatured: !isFeatured } }); toast({ title: !isFeatured ? "Featured" : "Unfeatured" }); refetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleMarkSenior = async (id: number, isSenior: boolean) => {
    try { await markSenior.mutateAsync({ id, data: { isSenior: !isSenior } }); toast({ title: !isSenior ? "Marked as Senior" : "Unmarked as Senior" }); refetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleClearFilters = () => {
    setName(""); setStatus(""); setSubscriptionStatus("");
    setRegistrationDateFrom(""); setRegistrationDateTo(""); setBmdcNumber(""); setPage(1);
  };

  const doctors = data?.doctors || [];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">All Doctors</h1>
          <p className="text-muted-foreground mt-1">Manage doctor registrations and approvals</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="space-y-1.5">
                <Label className="text-xs">Doctor Name</Label>
                <Input
                  placeholder="Search by name or email..."
                  value={name}
                  onChange={e => { setName(e.target.value); setPage(1); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">BMDC No.</Label>
                <Input
                  placeholder="Search BMDC number..."
                  value={bmdcNumber}
                  onChange={e => { setBmdcNumber(e.target.value); setPage(1); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Approval Status</Label>
                <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subscription Status</Label>
                <Select value={subscriptionStatus} onValueChange={v => { setSubscriptionStatus(v); setPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="All Subscriptions" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscriptions</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Registered From</Label>
                <Input
                  type="date"
                  value={registrationDateFrom}
                  onChange={e => { setRegistrationDateFrom(e.target.value); setPage(1); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Registered To</Label>
                <Input
                  type="date"
                  value={registrationDateTo}
                  onChange={e => { setRegistrationDateTo(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            {(name || bmdcNumber || status || subscriptionStatus || registrationDateFrom || registrationDateTo) && (
              <div className="mt-3">
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground h-7 text-xs">
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Doctors ({data?.total ?? 0})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {doctors.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">No doctors found</div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="md:hidden divide-y">
                  {doctors.map(doc => (
                    <div key={doc.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-sm">{doc.name}</span>
                            {doc.isFeatured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                            {doc.isSenior && <Award className="h-3.5 w-3.5 text-blue-600 fill-blue-100" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{doc.email}</p>
                          <p className="text-xs text-muted-foreground">BMDC: {doc.bmdcNumber || "—"}</p>
                        </div>
                        <Badge variant={STATUS_BADGE[doc.approvalStatus || "pending"]}>{doc.approvalStatus}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(doc as any).subscriptionPaymentStatus ? (
                          <Badge variant={SUB_BADGE[(doc as any).subscriptionPaymentStatus] ?? "secondary"} className="text-xs">
                            {(doc as any).subscriptionPaymentStatus}
                          </Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {(doc as any).subscriptionMonthlyFee != null ? (
                            <span className="text-orange-600 font-medium">৳{(doc as any).subscriptionMonthlyFee}/mo</span>
                          ) : doc.subscriptionFee === 0 ? (
                            <span className="text-green-600 font-medium">Free</span>
                          ) : (
                            <span className="text-orange-600 font-medium">৳{doc.subscriptionFee}</span>
                          )}
                        </span>
                        {(doc as any).subscriptionEndDate && (
                          <span className="text-xs text-muted-foreground">Until {(doc as any).subscriptionEndDate}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 pt-1 border-t">
                        {doc.approvalStatus === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleApprove(doc.id)} title="Approve"><CheckCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleReject(doc.id)} title="Reject"><XCircle className="h-4 w-4" /></Button>
                          </>
                        )}
                        {doc.approvalStatus === "approved" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleReject(doc.id)} title="Revoke"><XCircle className="h-4 w-4" /></Button>
                        )}
                        {doc.approvalStatus === "rejected" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleApprove(doc.id)} title="Re-approve"><CheckCircle className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className={`h-8 w-8 ${doc.isFeatured ? "text-amber-500" : "text-muted-foreground"}`} onClick={() => handleFeature(doc.id, doc.isFeatured || false)} title={doc.isFeatured ? "Unfeature" : "Feature"}><Star className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className={`h-8 w-8 ${doc.isSenior ? "text-blue-600" : "text-muted-foreground"}`} onClick={() => handleMarkSenior(doc.id, doc.isSenior || false)} title={doc.isSenior ? "Unmark Senior" : "Mark as Senior"}><Award className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>BMDC</TableHead>
                        <TableHead>Sub Fee</TableHead>
                        <TableHead>Sub Status</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {doctors.map(doc => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{doc.name}</span>
                              {doc.isFeatured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                              {doc.isSenior && <Award className="h-3.5 w-3.5 text-blue-600 fill-blue-100" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{doc.email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate((doc as any).registrationDate || (doc as any).createdAt)}
                          </TableCell>
                          <TableCell className="text-sm font-mono">{doc.bmdcNumber || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {(doc as any).subscriptionMonthlyFee != null ? (
                              <span className="text-orange-600 font-medium">৳{(doc as any).subscriptionMonthlyFee}/mo</span>
                            ) : doc.subscriptionFee === 0 ? (
                              <span className="text-green-600 font-medium">Free</span>
                            ) : (
                              <span className="text-orange-600 font-medium">৳{doc.subscriptionFee}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(doc as any).subscriptionPaymentStatus ? (
                              <Badge variant={SUB_BADGE[(doc as any).subscriptionPaymentStatus] ?? "secondary"}>
                                {(doc as any).subscriptionPaymentStatus}
                              </Badge>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {(doc as any).subscriptionEndDate || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_BADGE[doc.approvalStatus || "pending"]}>{doc.approvalStatus}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {doc.approvalStatus === "pending" && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleApprove(doc.id)} title="Approve"><CheckCircle className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleReject(doc.id)} title="Reject"><XCircle className="h-4 w-4" /></Button>
                                </>
                              )}
                              {doc.approvalStatus === "approved" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleReject(doc.id)} title="Revoke"><XCircle className="h-4 w-4" /></Button>
                              )}
                              {doc.approvalStatus === "rejected" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleApprove(doc.id)} title="Re-approve"><CheckCircle className="h-4 w-4" /></Button>
                              )}
                              <Button variant="ghost" size="icon" className={`h-7 w-7 ${doc.isFeatured ? "text-amber-500" : "text-muted-foreground"}`} onClick={() => handleFeature(doc.id, doc.isFeatured || false)} title={doc.isFeatured ? "Unfeature" : "Feature"}><Star className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className={`h-7 w-7 ${doc.isSenior ? "text-blue-600" : "text-muted-foreground"}`} onClick={() => handleMarkSenior(doc.id, doc.isSenior || false)} title={doc.isSenior ? "Unmark Senior" : "Mark as Senior"}><Award className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {data && data.total > 20 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-4 py-2 text-sm">Page {page} of {Math.ceil(data.total / 20)}</span>
            <Button variant="outline" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
