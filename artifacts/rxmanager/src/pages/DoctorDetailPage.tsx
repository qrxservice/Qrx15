import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { storageUrl } from "@/lib/storage";
import { useGetDoctor, useCreateAppointment, useGetDoctorNotices, useGetDoctorReviews, useSubmitReview, getGetDoctorQueryKey, useGetAppSettings, useGetPricing } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { BannerSlot, AdsenseSlot } from "@/components/PromoSlots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Stethoscope, MapPin, Clock, Star, GraduationCap, Phone, Calendar, CheckCircle2, AlertTriangle, Globe, Wifi, Video, Zap, UmbrellaOff, Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

function OnlineStatusDot({ status }: { status: string | null }) {
  if (status === "online") return <span className="h-3 w-3 rounded-full bg-green-500 border-2 border-white inline-block animate-pulse" title="🟢 Available" />;
  if (status === "busy") return <span className="h-3 w-3 rounded-full bg-yellow-500 border-2 border-white inline-block" title="🟡 On Break" />;
  if (status === "vacation") return <span className="h-3 w-3 rounded-full bg-blue-400 border-2 border-white inline-block" title="On Vacation" />;
  return <span className="h-3 w-3 rounded-full bg-red-500 border-2 border-white inline-block" title="🔴 Day Ended / Unavailable" />;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
      ))}
    </div>
  );
}

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: doctor, isLoading } = useGetDoctor(Number(id), {
    query: { queryKey: getGetDoctorQueryKey(Number(id)), refetchInterval: 15000, refetchOnWindowFocus: true },
  });
  const { data: notices } = useGetDoctorNotices(Number(id));
  const { data: reviewData } = useGetDoctorReviews(Number(id));
  const createAppt = useCreateAppointment();
  const submitReview = useSubmitReview();
  const { data: appSettings } = useGetAppSettings();
  const { data: pricing } = useGetPricing();

  const [showForm, setShowForm] = useState(false);
  const [showDonationStep, setShowDonationStep] = useState(false);
  const [isDonationPaying, setIsDonationPaying] = useState(false);
  const [reviewForm, setReviewForm] = useState({ patientName: "", patientPhone: "", rating: 0, reviewText: "" });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewHover, setReviewHover] = useState(0);
  const [successData, setSuccessData] = useState<{ serialNo: number; appointmentDate: string } | null>(null);
  const { user, token } = useAuth();
  const [form, setForm] = useState({
    patientName: "", patientPhone: "", patientEmail: "", patientAge: "", patientGender: "Male",
    complaint: "", appointmentDate: new Date().toISOString().split("T")[0]
  });
  const [autofilled, setAutofilled] = useState(false);

  useEffect(() => {
    if (!token || !user || user.role !== "patient" || autofilled) return;
    const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${apiBase}/api/patient/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(profile => {
        setForm(f => ({
          ...f,
          patientName: f.patientName || profile.name || "",
          patientPhone: f.patientPhone || profile.phone || "",
          patientEmail: f.patientEmail || profile.email || "",
          patientAge: f.patientAge || (profile.dateOfBirth ? String(new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear()) : ""),
          patientGender: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : f.patientGender,
        }));
        setAutofilled(true);
      })
      .catch(() => {});
  }, [token, user, autofilled]);

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const activeNotices = (Array.isArray(notices) ? notices : []).filter(n => {
    if (!n.isActive) return false;
    if (!n.fromDate && !n.toDate) return true;
    const start = n.fromDate ? new Date(`${n.fromDate}T${n.fromTime || "00:00"}`) : null;
    const end = n.toDate ? new Date(`${n.toDate}T${n.toTime || "23:59"}`) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  });

  // Vacation/emergency notices that have explicit date ranges — used to block
  // specific appointment dates only (not all future dates).
  const vacationNotices = (Array.isArray(notices) ? notices : []).filter(n =>
    n.isActive && (n.type === "vacation" || n.type === "emergency_unavailable") && !!n.fromDate && !!n.toDate
  );

  // Returns true only if the given YYYY-MM-DD date falls within a vacation period.
  const isDateBlocked = (date: string) =>
    vacationNotices.some(n => !!n.fromDate && !!n.toDate && date >= n.fromDate && date <= n.toDate);

  // Vacation notice currently active (for banner / badge display only).
  const blockingVacation = activeNotices.find(n => n.type === "vacation" || n.type === "emergency_unavailable");
  const isCurrentlyOnVacation = !!blockingVacation;
  const nextAvailableDate = (() => {
    if (!blockingVacation?.toDate) return null;
    const d = new Date(`${blockingVacation.toDate}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  })();

  const autoBookRef = useRef(false);
  useEffect(() => {
    if (autoBookRef.current || notices === undefined) return;
    if (new URLSearchParams(window.location.search).get("book") === "1") {
      setShowForm(true);
      autoBookRef.current = true;
    }
  }, [notices]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewForm.rating === 0) {
      toast({ title: "Please select a star rating", variant: "destructive" });
      return;
    }
    try {
      await submitReview.mutateAsync({
        data: {
          doctorId: Number(id),
          patientName: reviewForm.patientName,
          patientPhone: reviewForm.patientPhone || undefined,
          rating: reviewForm.rating,
          reviewText: reviewForm.reviewText || undefined,
        }
      });
      setReviewSubmitted(true);
      toast({ title: "Review submitted — thank you!", description: "It will appear after admin approval." });
    } catch {
      toast({ title: "Failed to submit review", variant: "destructive" });
    }
  };

  // Donation amount/currency is resolved server-side by /pricing based on the
  // patient's detected country (Bangladesh -> BDT, elsewhere -> USD), so the
  // amount shown here always matches what the booking endpoint will freeze in.
  const donationEnabled = pricing?.donation.enabled ?? appSettings?.donationEnabled ?? false;
  const donationAmount = pricing?.donation.amount ?? appSettings?.donationAmount ?? 100;
  const donationMessage = pricing?.donation.message ?? appSettings?.donationMessage ?? "Your small contribution helps support charitable healthcare services.";
  const currencySym = pricing?.currencySymbol ?? "৳";

  const submitBooking = async () => {
    try {
      const result = await createAppt.mutateAsync({
        data: {
          doctorId: Number(id),
          patientName: form.patientName,
          patientPhone: form.patientPhone,
          patientEmail: form.patientEmail || undefined,
          patientAge: form.patientAge ? Number(form.patientAge) : undefined,
          patientGender: form.patientGender,
          complaint: form.complaint,
          appointmentDate: form.appointmentDate,
        }
      });
      setSuccessData({ serialNo: result.serialNo!, appointmentDate: result.appointmentDate! });
      setShowForm(false);
      setShowDonationStep(false);
    } catch {
      toast({ title: "Booking failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const blocker = vacationNotices.find(
      n => !!n.fromDate && !!n.toDate && form.appointmentDate >= n.fromDate && form.appointmentDate <= n.toDate
    );
    if (blocker) {
      toast({
        title: "Doctor Unavailable",
        description: `This doctor is on leave from ${blocker.fromDate} to ${blocker.toDate}. Please select another available date.`,
        variant: "destructive",
      });
      return;
    }
    if (donationEnabled) {
      setShowForm(false);
      setShowDonationStep(true);
      return;
    }
    await submitBooking();
  };

  const handleDonationPay = async () => {
    setIsDonationPaying(true);
    try {
      // ── FUTURE GATEWAY HOOK ──────────────────────────────────────────
      // When a real payment gateway (SSLCommerz, bKash, Nagad, Rocket) is
      // integrated, replace the simulated delay below with the SDK call:
      //
      //   const payRef = await initiateGatewayPayment({ amount: donationAmount, ... });
      //   if (!payRef.success) throw new Error("Payment failed");
      //
      // For now we simulate a successful payment immediately so the booking
      // flow is testable end-to-end before the gateway is wired up.
      await new Promise(r => setTimeout(r, 1500));
      // ────────────────────────────────────────────────────────────────
      await submitBooking();
    } finally {
      setIsDonationPaying(false);
    }
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-64 mb-4" /><Skeleton className="h-40" />
        </div>
      </PublicLayout>
    );
  }

  if (!doctor) return <PublicLayout><div className="container py-20 text-center text-muted-foreground">Doctor not found.</div></PublicLayout>;

  return (
    <PublicLayout>
      <BannerSlot position="doctor_detail" className="pt-8" />
      <AdsenseSlot position="doctor_detail" className="pt-2" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Active Notice Banner */}
        {activeNotices.length > 0 && (
          <div className="mb-4 space-y-2">
            {activeNotices.map(notice => (
              <Alert key={notice.id} className={notice.type === "vacation" || notice.type === "emergency_unavailable" ? "border-orange-300 bg-orange-50" : "border-blue-300 bg-blue-50"}>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-sm">
                  <strong>{notice.title}:</strong> {notice.message}
                  {(notice.type === "vacation" || notice.type === "emergency_unavailable") && notice.fromDate && notice.toDate ? (
                    <div className="mt-1 font-medium text-orange-700">
                      Vacation Period: {notice.fromDate} – {notice.toDate}
                      {nextAvailableDate && <span className="ml-2 text-green-700">· Available from: {nextAvailableDate}</span>}
                    </div>
                  ) : notice.fromDate && notice.toDate ? (
                    <span className="text-muted-foreground ml-1">
                      ({notice.fromDate}{notice.fromTime ? ` ${notice.fromTime}` : ""} to {notice.toDate}{notice.toTime ? ` ${notice.toTime}` : ""})
                    </span>
                  ) : null}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Header */}
        <Card className="mb-6">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-shrink-0 relative mx-auto sm:mx-0">
                <div className="h-36 w-28 overflow-hidden rounded-lg border bg-primary/10 flex items-center justify-center shadow-sm">
                  {storageUrl(doctor.photoUrl) ? (
                    <img src={storageUrl(doctor.photoUrl)} alt={doctor.name} className="h-full w-full object-cover" />
                  ) : (
                    <Stethoscope className="h-14 w-14 text-primary" />
                  )}
                </div>
                <div className="absolute bottom-1.5 right-1.5">
                  <OnlineStatusDot status={doctor.onlineStatus ?? null} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold">{doctor.name}</h1>
                      {doctor.isVerified && (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                          <span className="text-xs">✅</span> Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1">{doctor.degree}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {doctor.departmentName && <Badge>{doctor.departmentName}</Badge>}
                      {doctor.specialtyName && <Badge variant="outline">{doctor.specialtyName}</Badge>}
                      {doctor.onlineConsultationAvailable && <Badge className="bg-green-50 text-green-700 border-green-200 gap-1"><Video className="h-3 w-3" />Online Consultation</Badge>}
                      {doctor.emergencyAvailable && <Badge className="bg-red-50 text-red-700 border-red-200 gap-1"><Zap className="h-3 w-3" />Emergency</Badge>}
                      {isCurrentlyOnVacation && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-300 gap-1">
                          🏖️ Vacation{blockingVacation?.fromDate && blockingVacation?.toDate ? `: ${blockingVacation.fromDate} → ${blockingVacation.toDate}` : ""}
                        </Badge>
                      )}
                    </div>
                    {reviewData && reviewData.total > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <StarRating rating={Math.round(reviewData.avgRating)} />
                        <span className="text-sm text-muted-foreground">{reviewData.avgRating} ({reviewData.total} reviews)</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-stretch sm:items-end gap-1.5 w-full sm:w-auto shrink-0">
                    <Button size="lg" className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Book Appointment
                    </Button>
                    {isCurrentlyOnVacation && (
                      <div className="text-xs text-center sm:text-right space-y-0.5">
                        <p className="text-orange-600 flex items-center justify-center sm:justify-end gap-1">
                          <UmbrellaOff className="h-3 w-3" />
                          {blockingVacation?.fromDate && blockingVacation?.toDate
                            ? `Unavailable ${blockingVacation.fromDate} – ${blockingVacation.toDate}`
                            : "Appointments unavailable during this period"}
                        </p>
                        {nextAvailableDate && <p className="text-green-600 font-medium">Next available: {nextAvailableDate}</p>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm text-muted-foreground">
                  {doctor.chamberAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>{doctor.chamberAddress}</span>
                    </div>
                  )}
                  {doctor.visitingTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-primary" />
                      <span>{doctor.visitingTime}</span>
                    </div>
                  )}
                  {doctor.chamberAddress2 && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>{doctor.chamberAddress2}</span>
                    </div>
                  )}
                  {doctor.visitingTime2 && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-primary" />
                      <span>{doctor.visitingTime2}</span>
                    </div>
                  )}
                  {doctor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-primary" />
                      <span>{doctor.phone}</span>
                    </div>
                  )}
                  {doctor.experience != null && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 shrink-0 text-amber-500 fill-amber-500" />
                      <span>{doctor.experience} years experience</span>
                    </div>
                  )}
                  {(doctor.countryName || doctor.cityName) && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0 text-primary" />
                      <span>{[doctor.cityName, doctor.countryName].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {doctor.about && (
              <Card>
                <CardHeader><CardTitle>About</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground leading-relaxed">{doctor.about}</p></CardContent>
              </Card>
            )}
            {doctor.education && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" />Education</CardTitle></CardHeader>
                <CardContent>
                  {doctor.education.split(";").map((edu, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">{edu.trim()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {reviewData && reviewData.reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Patient Reviews
                    <Badge variant="secondary">{reviewData.total}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviewData.reviews.slice(0, 5).map(review => (
                    <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{review.patientName}</span>
                        <StarRating rating={review.rating} />
                      </div>
                      {review.reviewText && <p className="text-sm text-muted-foreground">{review.reviewText}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Write a Review */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-amber-500" />
                  Write a Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewSubmitted ? (
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="font-medium">Thank you for your review!</p>
                    <p className="text-sm text-muted-foreground mt-1">Your review will appear after approval.</p>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Your Rating *</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm(f => ({ ...f, rating: star }))}
                            onMouseEnter={() => setReviewHover(star)}
                            onMouseLeave={() => setReviewHover(0)}
                            className="p-0.5"
                          >
                            <Star className={`h-7 w-7 transition-colors ${
                              star <= (reviewHover || reviewForm.rating)
                                ? "fill-amber-400 text-amber-400"
                                : "text-gray-300"
                            }`} />
                          </button>
                        ))}
                        {reviewForm.rating > 0 && (
                          <span className="ml-2 text-sm text-muted-foreground self-center">
                            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][reviewForm.rating]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="reviewName">Your Name *</Label>
                        <Input id="reviewName" required placeholder="Mohammad Rafiq"
                          value={reviewForm.patientName}
                          onChange={e => setReviewForm(f => ({ ...f, patientName: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reviewPhone">Phone (optional)</Label>
                        <Input id="reviewPhone" placeholder="01XXXXXXXXX"
                          value={reviewForm.patientPhone}
                          onChange={e => setReviewForm(f => ({ ...f, patientPhone: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reviewText">Your Experience</Label>
                      <Textarea id="reviewText" rows={3} placeholder="Share your experience with this doctor..."
                        value={reviewForm.reviewText}
                        onChange={e => setReviewForm(f => ({ ...f, reviewText: e.target.value }))} />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitReview.isPending}>
                      {submitReview.isPending ? "Submitting..." : "Submit Review"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-primary">৳{doctor.consultationFee}</div>
                  <div className="text-sm text-muted-foreground mt-1">Consultation fee</div>
                </div>
                <div className="flex items-center justify-center gap-2 mb-3 text-sm">
                  <OnlineStatusDot status={doctor.onlineStatus ?? null} />
                  <span className="text-muted-foreground capitalize">
                    {doctor.onlineStatus === "online" ? "Available" : doctor.onlineStatus === "busy" ? "On Break" : doctor.onlineStatus === "vacation" ? "On Vacation" : "Day Ended"}
                  </span>
                </div>
                <Separator className="my-4" />
                <Button className="w-full" size="lg" onClick={() => setShowForm(true)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Appointment
                </Button>
                {isCurrentlyOnVacation && nextAvailableDate && (
                  <p className="text-xs text-center text-green-600 font-medium mt-2">Next available: {nextAvailableDate}</p>
                )}
                <Button variant="outline" className="w-full mt-2" asChild>
                  <a href={`/queue-display?doctorId=${doctor.id}`} target="_blank" rel="noreferrer">
                    View Live Queue (TV)
                  </a>
                </Button>
              </CardContent>
            </Card>
            {doctor.bmdcNumber && (
              <Card>
                <CardContent className="p-4 text-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">BMDC No.</span>
                    <span className="font-medium">{doctor.bmdcNumber}</span>
                  </div>
                  {doctor.isVerified && (
                    <div className="flex items-center gap-1.5 text-blue-600 text-xs">
                      <span>✅</span>
                      BMDC Verified Doctor
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Donation Payment Dialog */}
      <Dialog open={showDonationStep} onOpenChange={open => { if (!isDonationPaying) setShowDonationStep(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Donation Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-lg border border-rose-100 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900 p-4 text-sm text-rose-900 dark:text-rose-200">
              {donationMessage}
            </div>
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground mb-1">Donation Amount</p>
              <p className="text-4xl font-bold text-primary">{currencySym}{donationAmount}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Your serial number will be generated automatically after payment is confirmed.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowDonationStep(false); setShowForm(true); }}
                disabled={isDonationPaying}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700"
                onClick={handleDonationPay}
                disabled={isDonationPaying}
              >
                {isDonationPaying ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
                ) : (
                  <>Pay {currencySym}{donationAmount} & Confirm</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Appointment with {doctor.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBook} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="patientName">Full Name *</Label>
              <Input id="patientName" required value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} placeholder="Mohammad Rafiq" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patientPhone">Phone Number *</Label>
              <Input id="patientPhone" required value={form.patientPhone} onChange={e => setForm(f => ({ ...f, patientPhone: e.target.value }))} placeholder="01711111111" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patientEmail">Email (optional — for confirmation)</Label>
              <Input id="patientEmail" type="email" value={form.patientEmail} onChange={e => setForm(f => ({ ...f, patientEmail: e.target.value }))} placeholder="patient@example.com" />
              <p className="text-xs text-muted-foreground">We'll save your appointment confirmation details</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="patientAge">Age</Label>
                <Input id="patientAge" type="number" min="1" max="120" value={form.patientAge} onChange={e => setForm(f => ({ ...f, patientAge: e.target.value }))} placeholder="35" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.patientGender} onValueChange={v => setForm(f => ({ ...f, patientGender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointmentDate">Preferred Date *</Label>
              <Input
                id="appointmentDate"
                type="date"
                required
                value={form.appointmentDate}
                min={today}
                className={isDateBlocked(form.appointmentDate) ? "border-red-500 focus-visible:ring-red-500" : ""}
                onChange={e => setForm(f => ({ ...f, appointmentDate: e.target.value }))}
              />
              {isDateBlocked(form.appointmentDate) && (() => {
                const blocker = vacationNotices.find(
                  n => !!n.fromDate && !!n.toDate && form.appointmentDate >= n.fromDate && form.appointmentDate <= n.toDate
                );
                return (
                  <Alert className="border-red-300 bg-red-50 py-2 mt-1">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-sm text-red-800">
                      <strong>Doctor Unavailable</strong><br />
                      This doctor is on leave from <strong>{blocker?.fromDate}</strong> to <strong>{blocker?.toDate}</strong>.<br />
                      Please select another available date or book an appointment after the vacation period. Thank you.
                    </AlertDescription>
                  </Alert>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="complaint">Chief Complaint</Label>
              <Textarea id="complaint" value={form.complaint} onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))} placeholder="Brief description of symptoms..." rows={3} />
            </div>
            <Button type="submit" className="w-full" disabled={createAppt.isPending || isDateBlocked(form.appointmentDate)}>
              {createAppt.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!successData} onOpenChange={() => setSuccessData(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Booking Confirmed!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-6xl font-bold text-primary my-4">#{successData?.serialNo}</div>
            <p className="text-muted-foreground">Your serial number</p>
            <p className="mt-2 text-sm">Appointment Date: <strong>{successData?.appointmentDate}</strong></p>
            <p className="mt-1 text-sm text-muted-foreground">Please arrive on time and show this serial number.</p>
            {form.patientEmail && <p className="mt-2 text-xs text-green-600">Confirmation details saved for {form.patientEmail}</p>}
          </div>
          <Button onClick={() => setSuccessData(null)} className="w-full">Done</Button>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
