import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PatientLayout } from "@/components/layout/PatientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, QrCode, ChevronRight, AlertCircle, Stethoscope, X, Download } from "lucide-react";
import { Link } from "wouter";
import QRCode from "qrcode";

interface Prescription {
  id: number;
  referenceNo: string;
  patientName: string;
  diagnosis?: string;
  chiefComplaint?: string;
  followUpDate?: string;
  createdAt: string;
  doctorName?: string;
  doctorSpecialty?: string;
}

export default function PatientPrescriptionsPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [hasPhone, setHasPhone] = useState(true);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{ ref: string; dataUrl: string } | null>(null);
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${apiBase}/api/patient/profile`, { headers }).then(r => r.json()),
      fetch(`${apiBase}/api/patient/prescriptions`, { headers }).then(r => r.json()),
    ]).then(([profile, rxData]) => {
      setHasPhone(!!profile.phone);
      setPrescriptions(rxData.prescriptions || []);
    }).finally(() => setLoading(false));
  }, [token]);

  const showQr = async (rx: Prescription) => {
    const url = `${window.location.origin}/verify/${rx.referenceNo}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 });
    setQrModal({ ref: rx.referenceNo, dataUrl });
  };

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("myPrescriptions")}</h1>
          <p className="text-muted-foreground text-sm">{t("myPrescriptionsDesc")}</p>
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
        ) : prescriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t("noPrescriptions")}</p>
              <p className="text-sm mt-1">{t("noPrescriptionsDesc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {prescriptions.map(rx => (
              <Card key={rx.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-start gap-4 pt-4 pb-4">
                  <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0 mt-0.5">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-sm">Ref: {rx.referenceNo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rx.diagnosis || rx.chiefComplaint || "—"}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{new Date(rx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Stethoscope className="h-3 w-3" /> Dr. {rx.doctorName || "—"} {rx.doctorSpecialty && `· ${rx.doctorSpecialty}`}
                    </p>
                    {rx.followUpDate && (
                      <p className="text-xs mt-1 text-primary">Follow-up: {rx.followUpDate}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => showQr(rx)}>
                        <QrCode className="h-3 w-3" /> {t("showQr")}
                      </Button>
                      <Link href={`/verify/${rx.referenceNo}`}>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs h-7">
                          {t("verify")} <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                        onClick={() => window.open(`${window.location.origin}${apiBase}/verify/${rx.referenceNo}`, "_blank")}>
                        <Download className="h-3 w-3" /> {t("downloadPrescription") || "Download"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setQrModal(null)}>
          <div className="bg-background rounded-xl p-6 shadow-2xl max-w-xs w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Prescription QR</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQrModal(null)}><X className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Ref: {qrModal.ref}</p>
            <img src={qrModal.dataUrl} alt="QR Code" className="mx-auto rounded-lg" />
            <p className="text-xs text-muted-foreground mt-4">{t("scanToVerify")}</p>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}
