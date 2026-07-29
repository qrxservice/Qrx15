import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListDonations, useGetAdminSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Heart, Wallet, Receipt, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminDonationsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useListDonations({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page, limit,
  });
  const { data: adminSettings } = useGetAdminSettings();

  const donations = data?.donations ?? [];
  const total = data?.total ?? 0;
  const totalCollected = data?.totalCollected ?? 0;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-6 w-6 text-rose-500" />
              Donation Payment History
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track every donation collected during appointment booking
            </p>
          </div>
          <Badge variant={adminSettings?.donationEnabled ? "default" : "secondary"}>
            Donation Payment is {adminSettings?.donationEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold">৳{totalCollected.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Donations</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dateFrom" className="text-xs">From</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateTo" className="text-xs">To</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-40" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Donation Records</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
            ) : donations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No donation records found.</p>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="md:hidden divide-y -mx-6">
                  {donations.map(d => (
                    <div key={d.id} className="px-6 py-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{d.patientName}</p>
                          <p className="text-xs text-muted-foreground">{d.patientPhone}</p>
                        </div>
                        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 shrink-0">৳{d.donationAmount ?? 0}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {d.doctorName ?? `Doctor #${d.doctorId}`} · #{d.serialNo} · {d.appointmentDate}
                      </p>
                      {d.donationPaidAt && (
                        <p className="text-xs text-muted-foreground">
                          Paid: {new Date(d.donationPaidAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Appointment Date</TableHead>
                        <TableHead>Serial No.</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donations.map(d => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <div className="font-medium">{d.patientName}</div>
                            <div className="text-xs text-muted-foreground">{d.patientPhone}</div>
                          </TableCell>
                          <TableCell>{d.doctorName ?? `Doctor #${d.doctorId}`}</TableCell>
                          <TableCell>{d.appointmentDate}</TableCell>
                          <TableCell>#{d.serialNo}</TableCell>
                          <TableCell>
                            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">৳{d.donationAmount ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {d.donationPaidAt ? new Date(d.donationPaidAt).toLocaleString() : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {total > limit && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} · {total} total
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
