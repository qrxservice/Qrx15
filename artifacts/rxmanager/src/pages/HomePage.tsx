import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useListDepartments, useListDoctors, useListCountries, useDetectLocation, useGetAppSettings, useListSliders, getListDoctorsQueryKey } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { BannerSlot, AdSlot } from "@/components/PromoSlots";
import { SliderGroup } from "@/components/HomepageSlider";
import { VideoPromoBlock } from "@/components/VideoPromoBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Star, Stethoscope, Clock, ChevronRight, Users, Award, Building2, Globe, ShieldCheck, Video, Zap, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { storageUrl } from "@/lib/storage";

function OnlineStatusDot({ status }: { status?: string | null }) {
  if (!status || status === "offline") return <span className="h-2.5 w-2.5 rounded-full bg-gray-400 border border-white" />;
  if (status === "online") return <span className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-green-500/40 border border-white animate-pulse" />;
  if (status === "busy") return <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 border border-white" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-orange-400 border border-white" />;
}

// Unmistakable green "Online" pill shown on doctor cards when the doctor is live.
function OnlineLabel({ status }: { status?: string | null }) {
  if (status !== "online") return null;
  return (
    <Badge className="bg-green-500 text-white border-transparent text-[10px] gap-1 px-2 py-0.5 hover:bg-green-500">
      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />Online
    </Badge>
  );
}

// Admin-configurable accent for homepage doctor cards (falls back to primary).
const doctorCardAccent = { borderTopColor: "hsl(var(--doctor-card, var(--primary)))" } as const;

function DocAvatar({ name, photoUrl, sizeClass, bgClass, textClass }: { name: string; photoUrl?: string | null; sizeClass: string; bgClass: string; textClass: string }) {
  const [err, setErr] = useState(false);
  const src = storageUrl(photoUrl);
  if (src && !err) return <img src={src} alt={name} onError={() => setErr(true)} className={cn(sizeClass, "rounded-full object-cover")} />;
  return (
    <div className={cn(sizeClass, "rounded-full flex items-center justify-center", bgClass)}>
      <span className={textClass}>{name.charAt(0)}</span>
    </div>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [, setLocation] = useLocation();

  const { data: departments } = useListDepartments();
  const { data: featuredData } = useListDoctors({ featured: true, limit: 6 });
  const { data: onlineDoctors } = useListDoctors({ onlineOnly: "true", limit: 4 }, {
    query: { queryKey: getListDoctorsQueryKey({ onlineOnly: "true", limit: 4 }), refetchInterval: 15000 },
  });
  const { data: allDoctorsData } = useListDoctors({ limit: 50 }, {
    query: { queryKey: getListDoctorsQueryKey({ limit: 50 }), refetchInterval: 15000 },
  });
  const seniorDoctors = (allDoctorsData?.doctors ?? [])
    .filter(d => d.isSenior)
    .slice(0, 6);
  const { data: countries } = useListCountries();
  const { data: geoData } = useDetectLocation();
  const { data: appSettings } = useGetAppSettings();

  const heroImg = storageUrl(appSettings?.heroImageUrl);
  const heroOverlayColor = appSettings?.heroOverlayColor ?? "#0f172a";
  const heroOverlayOpacity = (appSettings?.heroOverlayOpacity ?? 40) / 100;

  useEffect(() => {
    if (geoData && !countryFilter) {
      const savedCountry = localStorage.getItem("selected_country");
      if (savedCountry) setCountryFilter(savedCountry);
    }
  }, [geoData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (countryFilter && countryFilter !== "all") params.set("countryId", countryFilter);
    setLocation(`/doctors?${params.toString()}`);
  };

  const handleCountryChange = (v: string) => {
    setCountryFilter(v);
    if (v && v !== "all") localStorage.setItem("selected_country", v);
    else localStorage.removeItem("selected_country");
  };

  const deptIcons: Record<string, string> = {
    // Core departments
    "Medicine": "💊",
    "Surgery": "🏥",
    "Cardiology": "🫀",
    "Orthopedics": "🦴",
    "Gynecology & Obstetrics": "🤰",
    "Gynecology": "🤰",
    "Obstetrics": "🤰",
    "Pediatrics": "👶",
    "Neurology": "🧠",
    "Dermatology": "🔬",
    "Ophthalmology": "👁️",
    "ENT": "👂",
    "Psychiatry": "🧩",
    "Urology": "💧",
    "Endocrinology": "🧬",
    "Gastroenterology": "🧪",
    "Pulmonology": "🫁",
    "Nephrology": "🩻",
    "Oncology": "🎗️",
    "Rheumatology": "💪",
    "Dentistry": "🦷",
    "Radiology": "📡",
    // Aliases
    "Eye": "👁️",
    "Dental": "🦷",
    "Lung": "🫁",
    "Kidney": "🩻",
    "Skin": "🔬",
    "Bone": "🦴",
    "Heart": "🫀",
    "Brain": "🧠",
    "Cancer": "🎗️",
    "Mental Health": "🧩",
    "Child Health": "👶",
    "Women Health": "🤰",
    "Ear Nose Throat": "👂",
    "General Medicine": "💊",
  };

  const detectedCountryName = geoData?.detected ? geoData.countryName : null;

  const { data: slidersData } = useListSliders();
  const allSliders = Array.isArray(slidersData) ? (slidersData as {
    id: number; title: string; imageUrl?: string | null; linkUrl?: string | null;
    buttonText?: string | null; description?: string | null; position: string;
    isActive: boolean; autoPlay: boolean; slideInterval: number;
    showArrows: boolean; showDots: boolean;
    desktopWidth?: number | null; desktopHeight?: number | null;
    mobileWidth?: number | null; mobileHeight?: number | null;
    tabletWidth?: number | null; tabletHeight?: number | null;
    customWidth?: number | null; customHeight?: number | null;
  }[]) : [];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className={cn("relative py-12 sm:py-20 md:py-28", !heroImg && "bg-gradient-to-br from-primary/10 via-background to-secondary/10")}>
        {heroImg && (
          <>
            <div className="absolute inset-0 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url(${heroImg})` }} />
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: heroOverlayColor, opacity: heroOverlayOpacity }} />
          </>
        )}
        <div className="container mx-auto px-4 relative z-10">
          {detectedCountryName && (
            <div className="flex items-center justify-center mb-4 sm:mb-6">
              <Badge variant="secondary" className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 gap-2">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Showing doctors near <strong>{detectedCountryName}</strong>
              </Badge>
            </div>
          )}
          <div className={cn("text-center mb-6 sm:mb-8", heroImg && "text-white")}>
            <Badge className="mb-3 sm:mb-4" variant="secondary">International Doctor Directory</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6 leading-tight">
              Find the Right Doctor,{" "}
              <span className={heroImg ? "text-teal-300" : "text-primary"}>Book Instantly</span>
            </h1>
            <p className={cn("text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto", heroImg ? "text-white/85" : "text-muted-foreground")}>
              Search verified doctors across the world. Check availability, book appointments, and track your queue — all in one place.
            </p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Doctor name, specialty, department..."
                  className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="h-11 sm:h-12 px-6 shrink-0">Search</Button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Select value={countryFilter} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-40 sm:w-44 h-9 text-sm">
                  <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {(Array.isArray(countries) ? countries : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.flag} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setLocation("/doctors")}>
                Browse All Doctors <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </form>

          <div className={cn("flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-8 sm:mt-10 text-xs sm:text-sm", heroImg ? "text-white/90" : "text-muted-foreground")}>
            <div className="flex items-center gap-1.5 sm:gap-2"><Users className={cn("h-4 w-4 shrink-0", heroImg ? "text-teal-300" : "text-primary")} /><span>500+ Doctors</span></div>
            <div className="flex items-center gap-1.5 sm:gap-2"><Building2 className={cn("h-4 w-4 shrink-0", heroImg ? "text-teal-300" : "text-primary")} /><span>12 Departments</span></div>
            <div className="flex items-center gap-1.5 sm:gap-2"><Award className={cn("h-4 w-4 shrink-0", heroImg ? "text-teal-300" : "text-primary")} /><span>BMDC Verified</span></div>
            <div className="flex items-center gap-1.5 sm:gap-2"><Globe className={cn("h-4 w-4 shrink-0", heroImg ? "text-teal-300" : "text-primary")} /><span>International</span></div>
          </div>
        </div>
      </section>

      <SliderGroup slides={allSliders} position="hero" className="mt-0" />
      <BannerSlot position="homepage_top" className="pt-8" />
      <AdSlot location="homepage_hero" className="pt-4" />
      <VideoPromoBlock position="homepage_hero" />
      <SliderGroup slides={allSliders} position="full_width" className="pt-4" />

      {/* Online Doctors Now */}
      {onlineDoctors && onlineDoctors.doctors?.length > 0 && (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <h2 className="text-xl font-bold">Doctors Online Now</h2>
              </div>
              <Link href="/doctors?onlineOnly=true">
                <Button variant="outline" size="sm">View All <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {onlineDoctors.doctors.map(doc => (
                <Link key={doc.id} href={`/doctors/${doc.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group border-t-2" style={doctorCardAccent}>
                    <CardContent className="p-4 text-center">
                      <div className="relative inline-block mb-2">
                        <DocAvatar name={doc.name} photoUrl={doc.photoUrl} sizeClass="h-12 w-12 mx-auto" bgClass="bg-primary/10" textClass="text-lg text-primary font-bold" />
                        <div className="absolute -bottom-0.5 -right-0.5 border-2 border-white rounded-full">
                          <OnlineStatusDot status={doc.onlineStatus} />
                        </div>
                      </div>
                      <p className="font-medium text-sm group-hover:text-primary truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{doc.specialtyName || doc.departmentName}</p>
                      <div className="mt-1.5 flex justify-center"><OnlineLabel status={doc.onlineStatus} /></div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Departments Grid */}
      <section className="py-10 sm:py-16 container mx-auto px-4">
        <div className="text-center mb-7 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Browse by Department</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Find specialists in your area of concern</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {(Array.isArray(departments) ? departments : []).map(dept => (
            <Link key={dept.id} href={`/doctors?department=${dept.id}`}>
              <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">{dept.icon || deptIcons[dept.name] || "🏥"}</div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{dept.name}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <SliderGroup slides={allSliders} position="boxed" className="py-4" />
      <BannerSlot position="homepage_middle" className="pb-4" />
      <AdSlot location="homepage_middle" className="pb-4" />
      <VideoPromoBlock position="homepage_middle" />
      <SliderGroup slides={allSliders} position="middle" className="pb-4" />

      {/* Most Senior Doctors */}
      {seniorDoctors.length > 0 && (
        <section className="py-10 sm:py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6 sm:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Award className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500" />Senior Doctors</h2>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">Handpicked senior specialists recommended by our medical team</p>
              </div>
              <Link href="/doctors">
                <Button variant="outline" size="sm">View All <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {seniorDoctors.map(doc => (
                <Card key={doc.id} className="hover:shadow-lg transition-shadow group border-t-2" style={doctorCardAccent}>
                  <CardContent className="p-5">
                    <div className="flex gap-4 mb-4">
                      <div className="relative shrink-0">
                        <DocAvatar name={doc.name} photoUrl={doc.photoUrl} sizeClass="h-16 w-16" bgClass="bg-amber-50" textClass="text-2xl text-amber-600 font-bold" />
                        <div className="absolute -bottom-0.5 -right-0.5 border-2 border-white rounded-full">
                          <OnlineStatusDot status={doc.onlineStatus} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold group-hover:text-primary transition-colors truncate">{doc.name}</h3>
                          {doc.isVerified && <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{doc.degree}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <OnlineLabel status={doc.onlineStatus} />
                          {doc.departmentName && <Badge variant="secondary" className="text-xs">{doc.departmentName}</Badge>}
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs gap-1"><Award className="h-2.5 w-2.5" />{doc.bmdcValidityYears} yrs BMDC</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                      {doc.chamberAddress && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary shrink-0" /><span className="truncate">{doc.chamberAddress}</span></div>}
                      {doc.visitingTime && <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary shrink-0" /><span>{doc.visitingTime}</span></div>}
                      {doc.experience != null && <div className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" /><span>{doc.experience} yrs experience</span></div>}
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-primary font-bold text-lg">৳{doc.consultationFee}</span>
                      <div className="flex gap-2">
                        <Link href={`/doctors/${doc.id}`}>
                          <Button size="sm" variant="outline">View Details</Button>
                        </Link>
                        <Link href={`/doctors/${doc.id}?book=1`}>
                          <Button size="sm">Book Appointment</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Doctors */}
      {featuredData && featuredData.doctors?.length > 0 && (
        <section className="py-10 sm:py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6 sm:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">Featured Doctors</h2>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">Our most recommended specialists</p>
              </div>
              <Link href="/doctors?featured=true">
                <Button variant="outline" size="sm">View All <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {featuredData.doctors.map(doc => (
                <Card key={doc.id} className="hover:shadow-lg transition-shadow group border-t-2" style={doctorCardAccent}>
                  <CardContent className="p-5">
                    <div className="flex gap-4 mb-4">
                      <div className="relative shrink-0">
                        <DocAvatar name={doc.name} photoUrl={doc.photoUrl} sizeClass="h-16 w-16" bgClass="bg-primary/10" textClass="text-2xl text-primary font-bold" />
                        <div className="absolute -bottom-0.5 -right-0.5 border-2 border-white rounded-full">
                          <OnlineStatusDot status={doc.onlineStatus} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold group-hover:text-primary transition-colors truncate">{doc.name}</h3>
                          {doc.isVerified && <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{doc.degree}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <OnlineLabel status={doc.onlineStatus} />
                          {doc.departmentName && <Badge variant="secondary" className="text-xs">{doc.departmentName}</Badge>}
                          {doc.onlineConsultationAvailable && <Badge className="bg-green-50 text-green-700 border-green-200 text-xs gap-1"><Video className="h-2.5 w-2.5" />Online</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                      {doc.chamberAddress && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary shrink-0" /><span className="truncate">{doc.chamberAddress}</span></div>}
                      {doc.visitingTime && <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary shrink-0" /><span>{doc.visitingTime}</span></div>}
                      {doc.experience != null && <div className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" /><span>{doc.experience} yrs experience</span></div>}
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-primary font-bold text-lg">৳{doc.consultationFee}</span>
                      <div className="flex gap-2">
                        <Link href={`/doctors/${doc.id}`}>
                          <Button size="sm" variant="outline">View Details</Button>
                        </Link>
                        <Link href={`/doctors/${doc.id}?book=1`}>
                          <Button size="sm">Book Appointment</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-10 sm:py-16 container mx-auto px-4">
        <div className="text-center mb-7 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">How It Works</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Simple steps to get medical help</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-3xl mx-auto">
          {[
            { step: "1", title: "Search Doctor", desc: "Find doctors by specialty, department, location or country", icon: "🔍" },
            { step: "2", title: "Book Appointment", desc: "Book instantly without creating an account", icon: "📅" },
            { step: "3", title: "Track Your Queue", desc: "Monitor your live queue position in real-time", icon: "📊" },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-2xl">{item.icon}</div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <BannerSlot position="homepage_bottom" className="pb-8" />
      <AdSlot location="homepage_bottom" className="pb-8" />
      <SliderGroup slides={allSliders} position="before_footer" className="pb-8" />
      <VideoPromoBlock position="before_footer" />

      {/* Doctor Registration CTA */}
      <section className="py-12 sm:py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <Stethoscope className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Are you a Doctor?</h2>
          <p className="text-primary-foreground/80 mb-6 sm:mb-8 max-w-lg mx-auto text-sm sm:text-base px-2">
            Join our platform to reach patients internationally. Manage appointments, prescriptions, and your live queue — all in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link href="/doctor-register">
              <Button size="lg" variant="secondary" className="text-sm sm:text-base">Register as Doctor</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-sm sm:text-base">Doctor Login</Button>
            </Link>
          </div>
        </div>
      </section>
      <VideoPromoBlock position="doctor_registration" />
    </PublicLayout>
  );
}
