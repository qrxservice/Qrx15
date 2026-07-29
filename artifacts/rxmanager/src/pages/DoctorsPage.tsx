import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListDoctors, useListDepartments, useListLocations, useListCountries, useListCities, getListDoctorsQueryKey } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { BannerSlot, AdsenseSlot } from "@/components/PromoSlots";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Filter, Clock, Star, Globe, Video, Zap, Wifi } from "lucide-react";
import { storageUrl } from "@/lib/storage";

function OnlineStatusDot({ status }: { status?: string | null }) {
  if (status === "online") return <span className="h-3 w-3 rounded-full bg-green-500 border-2 border-white animate-pulse" title="🟢 Available" />;
  if (status === "busy") return <span className="h-3 w-3 rounded-full bg-yellow-500 border-2 border-white" title="🟡 On Break" />;
  if (status === "vacation") return <span className="h-3 w-3 rounded-full bg-blue-400 border-2 border-white" title="On Vacation" />;
  // offline = day ended / unavailable
  return <span className="h-3 w-3 rounded-full bg-red-500 border-2 border-white" title="🔴 Day Ended / Unavailable" />;
}

function statusLabel(status?: string | null): { text: string; cls: string } {
  if (status === "online") return { text: "Available", cls: "text-green-700 bg-green-50 border-green-200" };
  if (status === "busy") return { text: "On Break", cls: "text-yellow-700 bg-yellow-50 border-yellow-200" };
  if (status === "vacation") return { text: "On Vacation", cls: "text-blue-700 bg-blue-50 border-blue-200" };
  return { text: "Day Ended", cls: "text-red-700 bg-red-50 border-red-200" };
}

type Doctor = {
  id: number;
  name: string;
  degree?: string | null;
  departmentName?: string | null;
  specialtyName?: string | null;
  chamberAddress?: string | null;
  visitingTime?: string | null;
  consultationFee?: number | null;
  experience?: number | null;
  onlineStatus?: string | null;
  isVerified?: boolean;
  onlineConsultationAvailable?: boolean;
  emergencyAvailable?: boolean;
  countryName?: string | null;
  cityName?: string | null;
  photoUrl?: string | null;
};

export default function DoctorsPage() {
  const { t } = useLanguage();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(() => urlParams.get("onlineOnly") === "true");
  const [page, setPage] = useState(1);
  const limit = 12;

  const queryParams = {
    search: search || undefined,
    departmentId: deptFilter && deptFilter !== "all" ? Number(deptFilter) : undefined,
    locationId: locationFilter && locationFilter !== "all" ? Number(locationFilter) : undefined,
    countryId: countryFilter && countryFilter !== "all" ? Number(countryFilter) : undefined,
    cityId: cityFilter && cityFilter !== "all" ? Number(cityFilter) : undefined,
    onlineOnly: onlineOnly ? "true" : undefined,
    page,
    limit,
  };

  const { data, isLoading } = useListDoctors(queryParams, {
    query: { queryKey: getListDoctorsQueryKey(queryParams), refetchInterval: 15000 },
  });
  const { data: departments } = useListDepartments();
  const { data: locations } = useListLocations();
  const { data: countries } = useListCountries();
  const { data: cities } = useListCities({ countryId: countryFilter && countryFilter !== "all" ? Number(countryFilter) : undefined });

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); };

  return (
    <PublicLayout>
      <BannerSlot position="doctors_listing" className="pt-8" />
      <AdsenseSlot position="doctor_listing" className="pt-2" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find a Doctor</h1>
          <p className="text-muted-foreground">Browse and search from our verified international doctor directory</p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-3">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, specialty, degree..."
                className="pl-10"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          <div className="flex flex-wrap gap-2">
            <Select value={countryFilter} onValueChange={v => { setCountryFilter(v); setCityFilter(""); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <Globe className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {(Array.isArray(countries) ? countries : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.flag} {c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {countryFilter && countryFilter !== "all" && (
              <Select value={cityFilter} onValueChange={v => { setCityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-36">
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {(Array.isArray(cities) ? cities : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {(Array.isArray(departments) ? departments : []).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={v => { setLocationFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations?.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button
              variant={onlineOnly ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => { setOnlineOnly(!onlineOnly); setPage(1); }}
            >
              <span className={`h-2 w-2 rounded-full ${onlineOnly ? "bg-green-300" : "bg-green-500"}`} />
              Online Now
            </Button>
          </div>
        </div>

        {/* Results count */}
        {data && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing {Math.min((page - 1) * limit + 1, data.total)}–{Math.min(page * limit, data.total)} of {data.total} doctors
          </p>
        )}

        {/* Doctor Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : !data?.doctors?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg">No doctors found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.doctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor as Doctor} />)}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > limit && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(data.total / limit)}</span>
            <Button variant="outline" disabled={page * limit >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

function DoctorAvatar({ name, photoUrl, onlineStatus }: { name: string; photoUrl?: string | null; onlineStatus?: string | null }) {
  const [err, setErr] = useState(false);
  const src = storageUrl(photoUrl);
  return (
    <div className="relative shrink-0">
      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
        {src && !err
          ? <img src={src} alt={name} onError={() => setErr(true)} className="h-full w-full object-cover" />
          : <span className="text-xl text-primary font-bold">{name.charAt(0)}</span>
        }
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 border-2 border-white rounded-full">
        <OnlineStatusDot status={onlineStatus} />
      </div>
    </div>
  );
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} onlineStatus={doctor.onlineStatus} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{doctor.name}</h3>
              {doctor.isVerified && (
                <span className="text-xs leading-none shrink-0" title="BMDC Verified">✅</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{doctor.degree}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {doctor.departmentName && <Badge variant="secondary" className="text-xs">{doctor.departmentName}</Badge>}
          <Badge variant="outline" className={`text-xs ${statusLabel(doctor.onlineStatus).cls}`}>
            {statusLabel(doctor.onlineStatus).text}
          </Badge>
          {doctor.onlineConsultationAvailable && (
            <Badge className="bg-green-50 text-green-700 border-green-200 text-xs gap-1"><Video className="h-2.5 w-2.5" />Online</Badge>
          )}
          {doctor.emergencyAvailable && (
            <Badge className="bg-red-50 text-red-700 border-red-200 text-xs gap-1"><Zap className="h-2.5 w-2.5" />Emergency</Badge>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
          {doctor.chamberAddress && (
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <span className="truncate">{doctor.chamberAddress}</span>
            </div>
          )}
          {(doctor.countryName || doctor.cityName) && (
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{[doctor.cityName, doctor.countryName].filter(Boolean).join(", ")}</span>
            </div>
          )}
          {doctor.visitingTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{doctor.visitingTime}</span>
            </div>
          )}
          {doctor.experience != null && (
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>{doctor.experience} yrs experience</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-primary font-bold">৳{doctor.consultationFee ?? "N/A"}</span>
          <div className="flex gap-2">
            <Link href={`/doctors/${doctor.id}`}>
              <Button size="sm" variant="outline">View Details</Button>
            </Link>
            <Link href={`/doctors/${doctor.id}?book=1`}>
              <Button size="sm">Book Appointment</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
