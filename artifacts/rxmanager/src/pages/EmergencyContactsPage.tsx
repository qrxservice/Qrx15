import { useMemo, useState } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePublicEmergencyContacts, useReportEmergencyContact, EMERGENCY_CATEGORIES, categoryLabel, type EmergencyContact } from "@/lib/emergency-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Ambulance, Wind, Droplet, Stethoscope, FlaskConical, Building2,
  Phone, ShieldCheck, Star, MapPin, Flag, Loader2, Search,
} from "lucide-react";
import { COUNTRIES, BD_DIVISIONS, districtsForDivision, upazilasForDistrict } from "@/lib/bd-locations";

const CATEGORY_ICONS: Record<string, typeof Ambulance> = {
  ambulance: Ambulance, oxygen: Wind, blood_donor: Droplet,
  emergency_doctor: Stethoscope, diagnostic_support: FlaskConical, hospital_contact: Building2,
};

function ReportButton({ contact }: { contact: EmergencyContact }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const reportMut = useReportEmergencyContact();
  const handleReport = async () => {
    if (!confirm(`${t("reportIncorrect")}: ${contact.mobileNumber}?`)) return;
    try {
      await reportMut.mutateAsync({ id: contact.id });
      toast({ title: t("reportThanks") });
    } catch { toast({ title: t("reportFailed"), variant: "destructive" }); }
  };
  return (
    <button onClick={handleReport} disabled={reportMut.isPending} className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2">
      {t("reportIncorrect")}
    </button>
  );
}

function ContactCard({ contact }: { contact: EmergencyContact }) {
  const { t } = useLanguage();
  const Icon = CATEGORY_ICONS[contact.category] ?? Phone;
  const location = [contact.area, contact.upazila, contact.district, contact.division].filter(Boolean).join(", ") || contact.country;
  return (
    <Card className={contact.isPriority ? "border-red-300 dark:border-red-900" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate flex items-center gap-1">
                {contact.name}
                {contact.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" aria-label={t("adminVerified")} />}
              </p>
              <p className="text-xs text-muted-foreground">{categoryLabel(contact.category)}</p>
            </div>
          </div>
          {contact.isPriority && <Badge className="bg-red-100 text-red-700 border-red-200 shrink-0 gap-1"><Star className="h-3 w-3 fill-red-600" />{t("priority")}</Badge>}
        </div>

        {contact.category === "ambulance" && (contact.driverName || contact.vehicleNumber) && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {contact.driverName && <p>{t("driverLabel")}: {contact.driverName}</p>}
            {contact.vehicleNumber && <p>{t("vehicleLabel")}: {contact.vehicleNumber}</p>}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{location}</span>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant={contact.availabilityStatus === "available" ? "default" : "secondary"} className="capitalize gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${contact.availabilityStatus === "available" ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
            {contact.availabilityStatus === "available" ? t("availableNow") : contact.availabilityStatus}
          </Badge>
          <Button asChild size="sm" className="gap-1.5">
            <a href={`tel:${contact.mobileNumber}`}><Phone className="h-3.5 w-3.5" />{contact.mobileNumber}</a>
          </Button>
        </div>

        <div className="flex justify-end"><ReportButton contact={contact} /></div>
      </CardContent>
    </Card>
  );
}

export default function EmergencyContactsPage() {
  const { t } = useLanguage();
  const [category, setCategory] = useState("all");
  const [country, setCountry] = useState("all");
  const [division, setDivision] = useState("all");
  const [district, setDistrict] = useState("");
  const [upazila, setUpazila] = useState("");
  const [area, setArea] = useState("");
  const isBangladesh = country === "all" || country === "Bangladesh";
  const [nearMeOnly, setNearMeOnly] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: contacts, isLoading } = usePublicEmergencyContacts({
    category: category === "all" ? undefined : category,
    country: country === "all" ? undefined : country,
    division: isBangladesh && division !== "all" ? division : undefined,
    district: isBangladesh ? (district || undefined) : undefined,
    upazila: isBangladesh ? (upazila || undefined) : undefined,
    area: area || undefined,
  });

  const list = useMemo(() => Array.isArray(contacts) ? contacts : [], [contacts]);

  const handleFindNearMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setMyLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setNearMeOnly(true);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-10 sm:py-14">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-3 bg-red-100 text-red-700 border-red-200 gap-1.5"><Ambulance className="h-3.5 w-3.5" />{t("emergency247Badge")}</Badge>
          <h1 className="text-2xl sm:text-4xl font-bold mb-3">{t("emergencyDirTitle")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            {t("emergencyDirDesc")}
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6 sm:py-8">
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder={t("allCategories")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCategories")}</SelectItem>
                  {EMERGENCY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={country} onValueChange={v => { setCountry(v); setDivision("all"); setDistrict(""); setUpazila(""); }}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder={t("country")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCountries")}</SelectItem>
                  {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {isBangladesh && (
                <>
                  <Select value={division} onValueChange={v => { setDivision(v); setDistrict(""); setUpazila(""); }}>
                    <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder={t("division")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allDivisions")}</SelectItem>
                      {BD_DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={district || "all"} onValueChange={v => { setDistrict(v === "all" ? "" : v); setUpazila(""); }} disabled={division === "all"}>
                    <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t("district")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allDistricts")}</SelectItem>
                      {districtsForDivision(division === "all" ? null : division).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={upazila || "all"} onValueChange={v => setUpazila(v === "all" ? "" : v)} disabled={!district}>
                    <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t("upazila")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allUpazilas")}</SelectItem>
                      {upazilasForDistrict(district).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              )}
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={area} onChange={e => setArea(e.target.value)} placeholder={t("searchAreaPlaceholder")} className="pl-8" />
              </div>
              <Button type="button" variant={nearMeOnly ? "default" : "outline"} size="sm" onClick={handleFindNearMe} disabled={locating} className="gap-1.5">
                {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
                {t("nearestToMe")}
              </Button>
            </div>
            {nearMeOnly && myLocation && (
              <p className="text-xs text-muted-foreground">
                {t("nearMeHint")}
                <button className="ml-2 underline" onClick={() => setNearMeOnly(false)}>{t("clearFilter")}</button>
              </p>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Ambulance className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{t("noEmergencyFound")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(c => <ContactCard key={c.id} contact={c} />)}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
