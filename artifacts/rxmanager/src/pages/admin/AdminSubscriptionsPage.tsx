import {
  useListSubscriptions, useUpdateSubscription,
  usePaySubscription, useRenewSubscription,
  useGetAdminSettings,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useMemo, useState } from "react";
import { CheckCircle, CreditCard, Download, MoreHorizontal, RefreshCw, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type MarkKind = "paid" | "unpaid" | "free" | "expired";

const MARK_MAP: Record<MarkKind, { paymentStatus: "paid" | "unpaid" | "free" | "expired"; status: "active" | "inactive" | "expired"; label: string }> = {
  paid: { paymentStatus: "paid", status: "active", label: "Mark Paid" },
  unpaid: { paymentStatus: "unpaid", status: "inactive", label: "Mark Unpaid" },
  free: { paymentStatus: "free", status: "active", label: "Mark Free" },
  expired: { paymentStatus: "expired", status: "expired", label: "Mark Expired" },
};

const MONTH_OPTIONS = [1, 2, 3, 6, 12];

function addMonths(dateStr: string | null | undefined, months: number): string {
  const base = dateStr && dateStr >= new Date().toISOString().split("T")[0]
    ? new Date(dateStr)
    : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().split("T")[0];
}

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [renewMonths, setRenewMonths] = useState<Record<number, number>>({});
  const [payMonths, setPayMonths] = useState<Record<number, number>>({});

  const { data, refetch } = useListSubscriptions({});
  const { data: adminSettings } = useGetAdminSettings();
  const update = useUpdateSubscription();
  const pay = usePaySubscription();
  const renew = useRenewSubscription();

  // Each subscription bills in the doctor's own currency (set at registration).
  // The pay/renew endpoints already compute the correct fee server-side from
  // this — these are just used to preview the amount in the admin table.
  const feeFor = (currency: string | null | undefined) =>
    currency === "USD" ? (adminSettings?.monthlySubscriptionFeeUsd ?? 5) : (adminSettings?.monthlySubscriptionFee ?? 500);
  const symbolFor = (currency: string | null | undefined) => (currency === "USD" ? "$" : "৳");

  const subscriptions = useMemo(() => data || [], [data]);

  const filtered = useMemo(() => subscriptions.filter(s => {
    if (paymentFilter !== "all" && s.paymentStatus !== paymentFilter) return false;
    if (search && !(s.doctorName ?? `Doctor #${s.doctorId}`).toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && (!s.endDate || s.endDate < dateFrom)) return false;
    if (dateTo && (!s.endDate || s.endDate > dateTo)) return false;
    return true;
  }), [subscriptions, paymentFilter, search, dateFrom, dateTo]);

  const handleMark = async (id: number, kind: MarkKind) => {
    const m = MARK_MAP[kind];
    try {
      await update.mutateAsync({ id, data: { paymentStatus: m.paymentStatus, status: m.status } });
      toast({ title: m.label.replace("Mark", "Marked as") });
      refetch();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  /** Record payment: marks paid + sets dates automatically */
  const handlePay = async (sub: typeof subscriptions[0]) => {
    const months = payMonths[sub.id] ?? 1;
    try {
      await pay.mutateAsync({ data: { doctorId: sub.doctorId, months } });
      toast({ title: `Payment recorded — ${months} month${months > 1 ? "s" : ""} activated` });
      setPayMonths(m => { const n = { ...m }; delete n[sub.id]; return n; });
      refetch();
    } catch {
      toast({ title: "Error recording payment", variant: "destructive" });
    }
  };

  /** Renew: extend end date by N months */
  const handleRenew = async (id: number) => {
    const months = renewMonths[id] ?? 1;
    try {
      await renew.mutateAsync({ id, data: { months } });
      toast({ title: `Renewed for ${months} month${months > 1 ? "s" : ""}` });
      setRenewMonths(m => { const n = { ...m }; delete n[id]; return n; });
      refetch();
    } catch {
      toast({ title: "Error renewing subscription", variant: "destructive" });
    }
  };

  const exportCsv = () => {
    const header = ["Doctor", "BMDC Years", "Monthly Fee", "Months", "Total Fee", "Payment", "Status", "Start Date", "Valid Until"];
    const rows = filtered.map(s => [
      s.doctorName ?? `Doctor #${s.doctorId}`,
      String(s.bmdcValidityYears ?? ""),
      s.monthlyFee != null ? String(s.monthlyFee) : (s.fee === 0 ? "Free" : "—"),
      String(s.months ?? ""),
      s.fee === 0 ? "Free" : String(s.fee),
      s.paymentStatus,
      s.status,
      s.startDate ?? "",
      s.endDate ?? "",
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Subscriptions</h1>
            <p className="text-muted-foreground mt-1">
              Manage doctor subscription payments · Monthly rate: <span className="font-medium text-foreground">৳{adminSettings?.monthlySubscriptionFee ?? 500} / ${adminSettings?.monthlySubscriptionFeeUsd ?? 5}</span>
            </p>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Status</Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Doctor Name</Label>
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctor..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry From</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry To</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subscriptions ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No subscriptions found</p>
              </div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="md:hidden divide-y">
                  {filtered.map(sub => {
                    const sym = symbolFor(sub.currency);
                    const selectedPayMonths = payMonths[sub.id] ?? 1;
                    const selectedRenewMonths = renewMonths[sub.id] ?? 1;
                    const payTotal = feeFor(sub.currency) * selectedPayMonths;
                    const renewPreview = addMonths(sub.endDate, selectedRenewMonths);
                    const isPending = pay.isPending || renew.isPending || update.isPending;
                    return (
                      <div key={sub.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-medium text-sm">{sub.doctorName || `Doctor #${sub.doctorId}`}</p>
                            <p className="text-xs text-muted-foreground">BMDC {sub.bmdcValidityYears} yrs · Until {sub.endDate || "—"}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={sub.paymentStatus === "paid" ? "default" : sub.paymentStatus === "free" ? "outline" : sub.paymentStatus === "expired" ? "destructive" : "secondary"}>{sub.paymentStatus}</Badge>
                            <Badge variant={sub.status === "active" ? "default" : sub.status === "expired" ? "destructive" : "secondary"}>{sub.status}</Badge>
                          </div>
                        </div>
                        <p className="text-sm font-medium">
                          {sub.monthlyFee != null ? `${sym}${sub.monthlyFee}/mo · ` : ""}
                          {sub.fee === 0 ? <span className="text-green-600">Free</span> : `${sym}${sub.fee} total`}
                        </p>
                        {sub.paymentStatus === "unpaid" && sub.fee > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="flex gap-1 flex-wrap">
                              {MONTH_OPTIONS.map(m => (
                                <button key={m} type="button" onClick={() => setPayMonths(prev => ({ ...prev, [sub.id]: m }))}
                                  className={`px-2 py-0.5 rounded text-xs border font-medium transition-colors ${selectedPayMonths === m ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>{m}mo</button>
                              ))}
                            </div>
                            <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50 h-7 text-xs" onClick={() => handlePay(sub)} disabled={isPending}>
                              <Banknote className="mr-1 h-3 w-3" />Pay {sym}{payTotal}
                            </Button>
                          </div>
                        )}
                        {(sub.paymentStatus === "paid" || sub.status === "active") && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="flex gap-1 flex-wrap">
                              {MONTH_OPTIONS.map(m => (
                                <button key={m} type="button" onClick={() => setRenewMonths(prev => ({ ...prev, [sub.id]: m }))}
                                  className={`px-2 py-0.5 rounded text-xs border font-medium transition-colors ${selectedRenewMonths === m ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>{m}mo</button>
                              ))}
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRenew(sub.id)} disabled={isPending} title={`Extends to ${renewPreview}`}>
                              <RefreshCw className="mr-1 h-3 w-3" />Renew → {renewPreview}
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-1 pt-1 border-t">
                          {sub.paymentStatus === "unpaid" && sub.fee > 0 && (
                            <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50" onClick={() => handleMark(sub.id, "paid")} disabled={isPending}>
                              <CheckCircle className="mr-1 h-3 w-3" />Mark Paid
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleMark(sub.id, "paid")}>Mark Paid</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMark(sub.id, "unpaid")}>Mark Unpaid</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMark(sub.id, "free")}>Mark Free</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleMark(sub.id, "expired")}>Mark Expired</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead>BMDC Yrs</TableHead>
                        <TableHead>Monthly</TableHead>
                        <TableHead>Total Fee</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead className="min-w-[300px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(sub => {
                  const sym = symbolFor(sub.currency);
                  const selectedPayMonths = payMonths[sub.id] ?? 1;
                  const selectedRenewMonths = renewMonths[sub.id] ?? 1;
                  const payTotal = feeFor(sub.currency) * selectedPayMonths;
                  const renewPreview = addMonths(sub.endDate, selectedRenewMonths);
                  const isPending = pay.isPending || renew.isPending || update.isPending;

                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium text-sm">{sub.doctorName || `Doctor #${sub.doctorId}`}</TableCell>
                      <TableCell>{sub.bmdcValidityYears} yrs</TableCell>
                      <TableCell>
                        {sub.monthlyFee != null
                          ? <span className="font-medium">{sym}{sub.monthlyFee}/mo</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className={sub.fee === 0 ? "text-green-600 font-medium" : "font-medium"}>
                          {sub.fee === 0 ? "Free" : `${sym}${sub.fee}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          sub.paymentStatus === "paid" ? "default" :
                          sub.paymentStatus === "free" ? "outline" :
                          sub.paymentStatus === "expired" ? "destructive" : "secondary"
                        }>
                          {sub.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.status === "active" ? "default" : sub.status === "expired" ? "destructive" : "secondary"}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{sub.endDate || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-2 py-1">
                          {/* Record Payment (for unpaid) */}
                          {sub.paymentStatus === "unpaid" && sub.fee > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <div className="flex gap-1">
                                {MONTH_OPTIONS.map(m => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => setPayMonths(prev => ({ ...prev, [sub.id]: m }))}
                                    className={`px-2 py-0.5 rounded text-xs border font-medium transition-colors
                                      ${selectedPayMonths === m
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background border-border hover:border-primary/50"
                                      }`}
                                  >
                                    {m}mo
                                  </button>
                                ))}
                              </div>
                              <Button
                                size="sm" variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50 h-7 text-xs"
                                onClick={() => handlePay(sub)}
                                disabled={isPending}
                              >
                                <Banknote className="mr-1 h-3 w-3" />
                                Pay {sym}{payTotal}
                              </Button>
                            </div>
                          )}

                          {/* Renew (for active/paid subscriptions) */}
                          {(sub.paymentStatus === "paid" || sub.status === "active") && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <div className="flex gap-1">
                                {MONTH_OPTIONS.map(m => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => setRenewMonths(prev => ({ ...prev, [sub.id]: m }))}
                                    className={`px-2 py-0.5 rounded text-xs border font-medium transition-colors
                                      ${selectedRenewMonths === m
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background border-border hover:border-primary/50"
                                      }`}
                                  >
                                    {m}mo
                                  </button>
                                ))}
                              </div>
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleRenew(sub.id)}
                                disabled={isPending}
                                title={`Extends to ${renewPreview}`}
                              >
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Renew → {renewPreview}
                              </Button>
                            </div>
                          )}

                          {/* Status dropdown */}
                          <div className="flex items-center gap-1">
                            {sub.paymentStatus === "unpaid" && sub.fee > 0 && (
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => handleMark(sub.id, "paid")}
                                disabled={isPending}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />Mark Paid
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleMark(sub.id, "paid")}>Mark Paid</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMark(sub.id, "unpaid")}>Mark Unpaid</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMark(sub.id, "free")}>Mark Free</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleMark(sub.id, "expired")}>Mark Expired</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
                </div>{/* /desktop table */}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
