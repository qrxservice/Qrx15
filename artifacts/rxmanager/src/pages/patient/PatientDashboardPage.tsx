import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PatientLayout } from "@/components/layout/PatientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, User, Phone, Stethoscope, Clock, ChevronRight, AlertCircle, Package, PackageCheck, Ambulance } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { storageUrl } from "@/lib/storage";

interface Appointment {
  id: number;
  patientName: string;
  appointmentDate: string;
  appointmentTime?: string;
  serialNo: number;
  status: string;
  doctorName?: string;
  doctorSpecialty?: string;
  chamberAddress?: string;
}

interface Prescription {
  id: number;
  referenceNo: string;
  diagnosis?: string;
  createdAt: string;
  doctorName?: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function PatientDashboardPage() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [hasPhone, setHasPhone] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalAppointments: 0, upcomingAppointments: 0, totalOrders: 0, pendingOrders: 0, prescriptionCount: 0 });

  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${apiBase}/api/patient/profile`, { headers }).then(r => r.json()),
      fetch(`${apiBase}/api/patient/appointments`, { headers }).then(r => r.json()),
      fetch(`${apiBase}/api/patient/prescriptions`, { headers }).then(r => r.json()),
      fetch(`${apiBase}/api/patient/stats`, { headers }).then(r => r.json()),
    ]).then(([profile, apptData, rxData, statsData]) => {
      setHasPhone(!!profile.phone);
      setProfilePicture(profile.profilePicture || null);
      setAppointments(apptData.appointments || []);
      setPrescriptions(rxData.prescriptions || []);
      setStats(statsData);
    }).finally(() => setLoading(false));
  }, [token]);

  const upcoming = appointments.filter(a => a.status !== "cancelled" && a.status !== "completed").slice(0, 3);
  const recentRx = prescriptions.slice(0, 3);
  const today = new Date().toISOString().split("T")[0];
  const todayAppts = appointments.filter(a => a.appointmentDate === today);

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {profilePicture ? (
            <img src={storageUrl(profilePicture) || profilePicture} alt={user?.name ?? ""} className="h-12 w-12 rounded-full object-cover border-2 border-border shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center border-2 border-border shrink-0">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
            <p className="text-muted-foreground">{t("welcomeBack")}, {user?.name}</p>
          </div>
        </div>

        {!hasPhone && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="flex items-start gap-3 pt-4">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-400">{t("addPhonePrompt")}</p>
                <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">{t("addPhoneDesc")}</p>
                <Link href="/patient/profile">
                  <Button size="sm" className="mt-2" variant="outline">{t("updateProfile")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="p-2.5 rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAppointments}</p>
                <p className="text-xs text-muted-foreground">{t("totalAppointments")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Clock className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.upcomingAppointments}</p>
                <p className="text-xs text-muted-foreground">{t("upcomingAppointments")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30"><Package className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">{t("totalOrders")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30"><PackageCheck className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                <p className="text-xs text-muted-foreground">{t("pendingOrders")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30"><FileText className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.prescriptionCount}</p>
                <p className="text-xs text-muted-foreground">{t("totalPrescriptions")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{t("upcomingAppointments")}</CardTitle>
              <Link href="/patient/appointments">
                <Button variant="ghost" size="sm" className="text-xs gap-1">{t("viewAll")} <ChevronRight className="h-3 w-3" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
              ) : upcoming.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t("noUpcomingAppointments")}</p>
                  <Link href="/doctors">
                    <Button size="sm" className="mt-3">{t("bookAppointment")}</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map(a => (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="p-2 rounded-md bg-primary/10 shrink-0"><Stethoscope className="h-4 w-4 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">Dr. {a.doctorName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{a.doctorSpecialty}</p>
                        <p className="text-xs mt-1">{a.appointmentDate} {a.appointmentTime && `· ${a.appointmentTime}`} · Serial #{a.serialNo}</p>
                      </div>
                      <Badge className={`text-xs shrink-0 ${STATUS_COLOR[a.status] || ""}`} variant="outline">{a.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Prescriptions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{t("recentPrescriptions")}</CardTitle>
              <Link href="/patient/prescriptions">
                <Button variant="ghost" size="sm" className="text-xs gap-1">{t("viewAll")} <ChevronRight className="h-3 w-3" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
              ) : recentRx.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t("noPrescriptions")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRx.map(rx => (
                    <Link key={rx.id} href={`/patient/prescriptions/${rx.id}`}>
                      <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors">
                        <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30 shrink-0"><FileText className="h-4 w-4 text-green-600" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Ref: {rx.referenceNo}</p>
                          <p className="text-xs text-muted-foreground truncate">{rx.diagnosis || "—"}</p>
                          <p className="text-xs mt-1 text-muted-foreground">Dr. {rx.doctorName || "—"} · {new Date(rx.createdAt).toLocaleDateString()}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ambulance quick access */}
        <Card className="border-red-200 bg-red-50/40 dark:bg-red-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
              <Ambulance className="h-4 w-4" />Ambulance Service
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/ambulance">
              <Button className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                <Ambulance className="h-4 w-4" />Book / SOS
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/doctors">
              <Button variant="outline" className="gap-2"><Stethoscope className="h-4 w-4" />{t("findDoctor")}</Button>
            </Link>
            <Link href="/patient/appointments">
              <Button variant="outline" className="gap-2"><Calendar className="h-4 w-4" />{t("myAppointments")}</Button>
            </Link>
            <Link href="/patient/prescriptions">
              <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" />{t("myPrescriptions")}</Button>
            </Link>
            <Link href="/patient/profile">
              <Button variant="outline" className="gap-2"><User className="h-4 w-4" />{t("myProfile")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PatientLayout>
  );
}
