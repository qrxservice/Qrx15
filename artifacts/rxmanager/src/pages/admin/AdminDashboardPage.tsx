import { useGetAdminStats } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, UserCheck, Calendar, CreditCard, Clock, ChevronRight, Activity, UserCog } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats } = useGetAdminStats();

  const statCards = [
    { title: "Total Doctors", value: stats?.totalDoctors ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/doctors" },
    { title: "Approved Doctors", value: stats?.approvedDoctors ?? 0, icon: UserCheck, color: "text-green-600", bg: "bg-green-50", href: "/admin/doctors" },
    { title: "Pending Approvals", value: stats?.pendingDoctors ?? 0, icon: Clock, color: "text-orange-600", bg: "bg-orange-50", href: "/admin/pending-doctors" },
    { title: "Total Appointments", value: stats?.totalAppointments ?? 0, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50", href: "/admin/appointments" },
    { title: "Today's Appointments", value: stats?.todayAppointments ?? 0, icon: Activity, color: "text-teal-600", bg: "bg-teal-50", href: "/admin/appointments" },
    { title: "Active Subscriptions", value: stats?.activeSubscriptions ?? 0, icon: CreditCard, color: "text-pink-600", bg: "bg-pink-50", href: "/admin/subscriptions" },
    { title: "Total Patients", value: stats?.totalPatients ?? 0, icon: UserCog, color: "text-indigo-600", bg: "bg-indigo-50", href: "/admin/doctors" },
    { title: "Total Revenue", value: stats?.totalRevenue ? `৳${stats.totalRevenue}` : "৳0", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50", href: "/admin/subscriptions" },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and management</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(card => (
            <Card key={card.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-full ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Review Pending Doctors", href: "/admin/pending-doctors", count: stats?.pendingDoctors ?? 0, urgent: (stats?.pendingDoctors ?? 0) > 0 },
                { label: "Manage All Doctors", href: "/admin/doctors", count: stats?.totalDoctors ?? 0 },
                { label: "View Subscriptions", href: "/admin/subscriptions", count: stats?.activeSubscriptions ?? 0 },
                { label: "Manage Medicines", href: "/admin/medicines" },
                { label: "Manage Banners", href: "/admin/banners" },
              ].map(action => (
                <Button key={action.href} variant="outline" className="w-full justify-between" asChild>
                  <Link href={action.href}>
                    <span>{action.label}</span>
                    <span className="flex items-center gap-2">
                      {action.count !== undefined && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${action.urgent ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}>
                          {action.count}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Platform Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Total Doctors</span>
                <span className="font-medium">{stats?.totalDoctors ?? 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Approved</span>
                <span className="font-medium text-green-600">{stats?.approvedDoctors ?? 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium text-orange-600">{stats?.pendingDoctors ?? 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Total Appointments</span>
                <span className="font-medium">{stats?.totalAppointments ?? 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Total Revenue</span>
                <span className="font-medium text-primary">৳{stats?.totalRevenue ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
