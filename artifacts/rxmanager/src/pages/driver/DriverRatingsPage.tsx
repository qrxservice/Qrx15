import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDriverRatings } from "@/lib/ambulance-api";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { Star, MessageSquare, TrendingUp, Award } from "lucide-react";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-200 fill-gray-200"}`} />
      ))}
    </div>
  );
}

function ratingBadgeColor(r: number): string {
  if (r >= 4.5) return "bg-green-100 text-green-700";
  if (r >= 3.5) return "bg-blue-100 text-blue-700";
  if (r >= 2.5) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export default function DriverRatingsPage() {
  const { data, isLoading } = useDriverRatings();

  // Distribution
  const dist = [5, 4, 3, 2, 1].map(n => ({
    star: n,
    count: data?.ratings.filter(r => r.rating === n).length ?? 0,
  }));
  const maxCount = Math.max(...dist.map(d => d.count), 1);

  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="font-bold text-xl">Ratings & Reviews</h1>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Star className="h-8 w-8 animate-pulse text-yellow-500" />
          </div>
        )}

        {data && (
          <>
            {/* Summary card */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-yellow-500">
                      {data.avgRating?.toFixed(1) ?? "—"}
                    </p>
                    {data.avgRating && (
                      <div className="flex justify-center mt-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`h-4 w-4 ${n <= Math.round(data.avgRating!) ? "text-yellow-500 fill-yellow-500" : "text-gray-200"}`} />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{data.ratingCount} reviews</p>
                  </div>

                  <div className="flex-1 space-y-1">
                    {dist.map(({ star, count }) => (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-right text-muted-foreground">{star}</span>
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 shrink-0" />
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-yellow-400 h-2 rounded-full transition-all"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-4 text-muted-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {data.avgRating && (
                  <div className="mt-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <Badge className={ratingBadgeColor(data.avgRating)}>
                      {data.avgRating >= 4.5 ? "Excellent" :
                       data.avgRating >= 3.5 ? "Good" :
                       data.avgRating >= 2.5 ? "Average" : "Needs Improvement"}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews list */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Customer Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.ratings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                    <p>No reviews yet.</p>
                    <p className="text-xs mt-1">Complete trips to receive ratings from passengers.</p>
                  </div>
                )}
                {data.ratings.map(r => (
                  <div key={r.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{r.userName ?? "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground">Trip #{r.requestId}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StarRow rating={r.rating} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {r.review && (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 italic">
                        "{r.review}"
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Improvement tips */}
            {data.avgRating != null && data.avgRating < 4 && (
              <Card className="border-blue-100 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Tips to improve your rating</p>
                      <ul className="text-xs text-blue-700 mt-1 space-y-1 list-disc list-inside">
                        <li>Arrive promptly at the pickup location</li>
                        <li>Keep your vehicle clean and well-maintained</li>
                        <li>Drive safely and calmly in all situations</li>
                        <li>Communicate clearly with passengers</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DriverLayout>
  );
}
