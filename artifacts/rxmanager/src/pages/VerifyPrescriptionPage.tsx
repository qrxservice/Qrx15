import { useRoute, Link } from "wouter";
import { useVerifyPrescription, getVerifyPrescriptionQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShieldCheck, ShieldX, Stethoscope, Loader2 } from "lucide-react";

export default function VerifyPrescriptionPage() {
  const [, params] = useRoute("/verify/:ref");
  const ref = params?.ref ?? "";
  const { lang } = useLanguage();
  const isBn = lang === "bn";
  const { data, isLoading } = useVerifyPrescription(ref, { query: { enabled: !!ref, queryKey: getVerifyPrescriptionQueryKey(ref) } });

  const t = isBn
    ? {
        title: "প্রেসক্রিপশন যাচাই", verifying: "যাচাই করা হচ্ছে...",
        valid: "যাচাইকৃত প্রেসক্রিপশন", invalid: "অবৈধ প্রেসক্রিপশন",
        validDesc: "এই প্রেসক্রিপশনটি QRX দ্বারা যাচাই করা হয়েছে।",
        invalidDesc: "এই রেফারেন্স নম্বরের কোনো বৈধ প্রেসক্রিপশন পাওয়া যায়নি।",
        refNo: "রেফারেন্স নং", doctor: "ডাক্তার", patient: "রোগী", date: "তারিখ", home: "হোমপেজে যান",
      }
    : {
        title: "Prescription Verification", verifying: "Verifying...",
        valid: "Verified Prescription", invalid: "Invalid Prescription",
        validDesc: "This prescription has been verified by QRX.",
        invalidDesc: "No valid prescription was found for this reference number.",
        refNo: "Reference No", doctor: "Doctor", patient: "Patient", date: "Date", home: "Go to Homepage",
      };

  const isValid = data?.valid === true;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-6">
        <Stethoscope className="h-6 w-6 text-teal-600" />
        <span className="font-bold text-xl text-teal-700 dark:text-teal-400">QRX</span>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border overflow-hidden">
        <div className="p-6 text-center border-b">
          <h1 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.title}</h1>
        </div>

        <div className="p-8 flex flex-col items-center text-center">
          {isLoading ? (
            <>
              <Loader2 className="h-12 w-12 text-teal-500 animate-spin mb-4" />
              <p className="text-muted-foreground">{t.verifying}</p>
            </>
          ) : isValid ? (
            <>
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mb-4">
                <ShieldCheck className="h-9 w-9 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-700 dark:text-green-400">{t.valid}</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-5">{t.validDesc}</p>
              <div className="w-full text-left space-y-2 bg-muted/40 rounded-lg p-4 text-sm">
                <Row label={t.refNo} value={data?.referenceNo ?? "—"} mono />
                <Row label={t.doctor} value={data?.doctorName ?? "—"} />
                <Row label={t.patient} value={data?.patientName ?? "—"} />
                <Row label={t.date} value={data?.createdAt ? new Date(data.createdAt).toLocaleDateString(isBn ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
              </div>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mb-4">
                <ShieldX className="h-9 w-9 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400">{t.invalid}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t.invalidDesc}</p>
              {ref && <p className="text-xs font-mono text-muted-foreground mt-3">{ref}</p>}
            </>
          )}
        </div>

        <div className="p-4 border-t text-center">
          <Link href="/">
            <span className="text-sm text-teal-600 hover:text-teal-700 cursor-pointer font-medium">{t.home}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={mono ? "font-mono font-medium text-right" : "font-medium text-right"}>{value}</span>
    </div>
  );
}
