import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListAllReviews, useApproveReview, useRejectReview } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const { data: reviews, refetch } = useListAllReviews();
  const approve = useApproveReview();
  const reject = useRejectReview();

  const handleApprove = async (id: number) => {
    try { await approve.mutateAsync({ id }); toast({ title: "Review approved" }); refetch(); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleReject = async (id: number) => {
    try { await reject.mutateAsync({ id }); toast({ title: "Review deleted" }); refetch(); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const pending = (reviews ?? []).filter(r => !r.isApproved);
  const approved = (reviews ?? []).filter(r => r.isApproved);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Patient Reviews</h1>
          <p className="text-muted-foreground text-sm mt-1">Moderate and approve patient reviews before they go public</p>
        </div>

        {pending.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2">Pending Approval <Badge variant="destructive">{pending.length}</Badge></h2>
            <div className="space-y-3">
              {pending.map(review => (
                <Card key={review.id} className="border-amber-200 bg-amber-50/30">
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{review.patientName}</span>
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-muted-foreground">Doctor #{review.doctorId}</span>
                      </div>
                      {review.reviewText && <p className="text-sm text-muted-foreground">{review.reviewText}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => handleApprove(review.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleReject(review.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-semibold mb-3">Approved Reviews ({approved.length})</h2>
          {!approved.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No approved reviews yet</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {approved.map(review => (
                <Card key={review.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{review.patientName}</span>
                        <StarRating rating={review.rating} />
                        <Badge variant="secondary" className="text-xs">Doctor #{review.doctorId}</Badge>
                      </div>
                      {review.reviewText && <p className="text-sm text-muted-foreground">{review.reviewText}</p>}
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => handleReject(review.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
