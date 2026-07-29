import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PatientLayout } from "@/components/layout/PatientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Stethoscope, MapPin, Clock, AlertCircle, User } from "lucide-react";
import { Link } from "wouter";
import { storageUrl } from "@/lib/storage";

interface Appointment {
  id: number;
  patientName: string;
  appointmentDate: string;
  appointmentTime?: string;
  serialNo: number;
  status: string;
  complaint?: string;
  trackingToken?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  chamberAddress?: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function PatientAppointmentsPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hasPhone, setHasPhone] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${apiBase}/api/patient/profile`, { headers }).then(r => r.json()),
      fetch(`${apiBase}/api/patient/appointments`, { headers }).then(r => r.json()),
    ]).then(([profile, apptData]) => {
      setHasPhone(!!profile.phone);
      setProfilePicture(profile.profilePicture || null);
      setAppointments(apptData.appointments || []);
    }).finally(() => setLoading(false));
  }, [token]);

  const upcoming = appointments.filter(a => a.status !== "cancelled" && a.status !== "completed");
  const past = appointments.filter(a => a.status === "completed" || a.status === "cancelled");

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profilePicture ? (
              <img src={storageUrl(profilePicture) || profilePicture} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-border shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border-2 border-border shrink-0">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{t("myAppointments")}</h1>
              <p className="text-muted-foreground text-sm">{t("myAppointmentsDesc")}</p>
            </div>
          </div>
          <Link href="/doctors">
            <Button className="gap-2"><Calendar className="h-4 w-4" />{t("bookAppointment")}</Button>
          </Link>
        </div>

        {!hasPhone && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="flex items-start gap-3 pt-4">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-400">{t("addPhonePrompt")}</p>
                <p className="text-sm text-amber-700 dark:text-amber-500">{t("addPhoneDesc")}</p>
                <Link href="/patient/profile">
                  <Button size="sm" className="mt-2" variant="outline">{t("updateProfile")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("loading")}</p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("upcomingAppointments")}</h2>
                <div className="space-y-3">
                  {upcoming.map(a => (
                    <AppointmentCard key={a.id} appointment={a} />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("pastAppointments")}</h2>
                <div className="space-y-3">
                  {past.map(a => (
                    <AppointmentCard key={a.id} appointment={a} />
                  ))}
                </div>
              </div>
            )}

            {appointments.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{t("noAppointmentsYet")}</p>
                  <p className="text-sm mt-1">{t("bookFirstAppointment")}</p>
                  <Link href="/doctors">
                    <Button className="mt-4">{t("findDoctor")}</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PatientLayout>
  );
}

function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 pt-4 pb-4">
        <div className="p-2.5 rounded-lg bg-primary/10 shrink-0 mt-0.5">
          <Stethoscope className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">Dr. {a.doctorName || "—"}</p>
              <p className="text-sm text-muted-foreground">{a.doctorSpecialty || "—"}</p>
            </div>
            <Badge className={`text-xs shrink-0 ${STATUS_COLOR[a.status] || ""}`} variant="outline">
              {a.status}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{a.appointmentDate}</span>
            {a.appointmentTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.appointmentTime}</span>}
            <span>Serial #{a.serialNo}</span>
          </div>
          {a.chamberAddress && (
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />{a.chamberAddress}
            </p>
          )}
          {a.complaint && <p className="mt-1 text-xs text-muted-foreground">Complaint: {a.complaint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
