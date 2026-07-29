import { useListAllDoctors, useApproveDoctor, useRejectDoctor } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, MapPin, Phone, GraduationCap, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminPendingDoctorsPage() {
  const { toast } = useToast();
  const { data, refetch } = useListAllDoctors({ status: "pending", limit: 50 });
  const approve = useApproveDoctor();
  const reject = useRejectDoctor();

  const handleApprove = async (id: number) => {
    try { await approve.mutateAsync({ id }); toast({ title: "Doctor approved! ✓" }); refetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleReject = async (id: number) => {
    try { await reject.mutateAsync({ id }); toast({ title: "Doctor rejected" }); refetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const doctors = data?.doctors || [];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pending Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and approve doctor registrations</p>
        </div>

        {doctors.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold">All caught up!</p>
            <p className="text-muted-foreground">No pending doctor approvals</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{doctors.length} doctor(s) awaiting review</p>
            {doctors.map(doc => (
              <Card key={doc.id} className="overflow-hidden">
                <div className="h-1 bg-orange-400" />
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-semibold text-lg">{doc.name}</h3>
                        <Badge variant="secondary">Pending Review</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{doc.degree}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {doc.email && (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{doc.email}</span>
                          </div>
                        )}
                        {doc.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{doc.phone}</span>
                          </div>
                        )}
                        {doc.chamberAddress && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{doc.chamberAddress}</span>
                          </div>
                        )}
                        {doc.visitingTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{doc.visitingTime}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {doc.departmentName && <Badge variant="outline">{doc.departmentName}</Badge>}
                        {doc.specialtyName && <Badge variant="outline">{doc.specialtyName}</Badge>}
                        {doc.locationName && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{doc.locationName}</Badge>}
                        {doc.bmdcNumber && <Badge variant="outline">BMDC: {doc.bmdcNumber}</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col gap-3 shrink-0">
                      <div className="text-center p-3 bg-muted/40 rounded-lg sm:w-28">
                        <div className="text-lg font-bold">{doc.bmdcValidityYears}yr</div>
                        <div className="text-xs text-muted-foreground">BMDC Validity</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg sm:w-28 ${doc.subscriptionFee === 0 ? "bg-green-50" : "bg-orange-50"}`}>
                        <div className={`text-lg font-bold ${doc.subscriptionFee === 0 ? "text-green-600" : "text-orange-600"}`}>
                          {doc.subscriptionFee === 0 ? "Free" : `৳${doc.subscriptionFee}`}
                        </div>
                        <div className="text-xs text-muted-foreground">Sub Fee</div>
                      </div>
                      <div className="text-center p-3 bg-muted/40 rounded-lg sm:w-28">
                        <div className="text-lg font-bold text-primary">৳{doc.consultationFee || 0}</div>
                        <div className="text-xs text-muted-foreground">Consult Fee</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    <Button className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none" onClick={() => handleApprove(doc.id)} disabled={approve.isPending}>
                      <CheckCircle className="mr-2 h-4 w-4" />Approve
                    </Button>
                    <Button variant="outline" className="text-destructive hover:text-destructive/80 flex-1 sm:flex-none border-destructive/30" onClick={() => handleReject(doc.id)} disabled={reject.isPending}>
                      <XCircle className="mr-2 h-4 w-4" />Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
