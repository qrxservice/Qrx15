import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDriverStats, useDriverProfile } from "@/lib/ambulance-api";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { TrendingUp, Wallet, Star, DollarSign, Calendar, BarChart3 } from "lucide-react";

function StatRow({ label, trips, earnings, highlight = false }: { label: string; trips: number; earnings: number; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-lg ${highlight ? "bg-green-50 border border-green-100" : "bg-gray-50"}`}>
      <div className="flex items-center gap-3">
        <Calendar className={`h-4 w-4 ${highlight ? "text-green-600" : "text-gray-400"}`} />
        <div>
          <p className={`text-sm font-medium ${highlight ? "text-green-800" : ""}`}>{label}</p>
          <p className="text-xs text-muted-foreground">{trips} trip{trips !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <p className={`font-bold ${highlight ? "text-green-700 text-lg" : "text-gray-800"}`}>
        ৳{earnings.toLocaleString()}
      </p>
    </div>
  );
}

export default function DriverEarningsPage() {
  const { data: stats, isLoading } = useDriverStats();
  const { data: driver } = useDriverProfile();

  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl">Earnings Centre</h1>
          {driver?.approvalStatus === "approved" && (
            <Badge className="bg-green-100 text-green-700">Active</Badge>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <TrendingUp className="h-8 w-8 animate-pulse text-green-500" />
          </div>
        )}

        {stats && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Total Earned</span>
                  </div>
                  <p className="text-2xl font-bold">৳{stats.total.earnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.total.trips} trips lifetime</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Wallet className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Net Earnings</span>
                  </div>
                  <p className="text-2xl font-bold">৳{stats.net.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">After {stats.commission.rate}% commission</p>
                </CardContent>
              </Card>
            </div>

            {/* Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Earnings Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <StatRow label="Today" trips={stats.today.trips} earnings={stats.today.earnings} highlight />
                <StatRow label="This Week" trips={stats.week.trips} earnings={stats.week.earnings} />
                <StatRow label="This Month" trips={stats.month.trips} earnings={stats.month.earnings} />
              </CardContent>
            </Card>

            {/* Commission breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Commission Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Earnings</span>
                    <span className="font-medium">৳{stats.total.earnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">QRX Commission ({stats.commission.rate}%)</span>
                    <span className="font-medium text-red-600">− ৳{stats.commission.amount.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Net Earnings</span>
                    <span className="text-green-600">৳{stats.net.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet (future) */}
            <Card className="border-dashed opacity-75">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                      <p className="text-xs text-muted-foreground">Withdrawal coming soon</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-500">৳{(stats.walletBalance ?? 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Rating summary */}
            {driver && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      <div>
                        <p className="text-sm font-medium">Average Rating</p>
                        <p className="text-xs text-muted-foreground">{driver.ratingCount} reviews</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{driver.avgRating?.toFixed(1) ?? "—"}</p>
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
