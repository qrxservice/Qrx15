import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useRegisterDoctor, useListDepartments, useListSpecialties, useListLocations, useListCountries, useListCities, useGetPricing } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Info, Calculator, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MONTH_OPTIONS = [1, 2, 3, 6, 12];

/** Compute the fee + label for a given validity-year count using the
 *  admin-configured, currency-aware tiers returned by GET /pricing. The
 *  currency itself is resolved server-side from the visitor's IP. */
function calcTieredFee(
  years: number,
  symbol: string,
  tiers: { maxYears?: number | null; fee: number }[] | undefined,
): { fee: number; label: string } {
  const t = tiers ?? [];
  const [tier1, tier2, tier3] = t;
  const t1Max = tier1?.maxYears ?? null;
  const t2Max = tier2?.maxYears ?? null;
  if (tier1 && (t1Max === null || years <= t1Max)) {
    return { fee: tier1.fee, label: tier1.fee === 0 ? `Free (≤${t1Max} years BMDC)` : `${symbol}${tier1.fee}/month (≤${t1Max} years BMDC)` };
  }
  if (tier2 && (t2Max === null || years <= t2Max)) {
    return { fee: tier2.fee, label: `${symbol}${tier2.fee}/month (${(t1Max ?? 0) + 1}–${t2Max} years BMDC)` };
  }
  const fee = tier3?.fee ?? 0;
  return { fee, label: `${symbol}${fee}/month (>${tier2?.maxYears ?? 0} years BMDC)` };
}

export default function DoctorRegisterPage() {
  const { toast } = useToast();
  const registerMutation = useRegisterDoctor();
  const { data: departments } = useListDepartments();
  const { data: specialties } = useListSpecialties({ departmentId: undefined });
  const { data: locations } = useListLocations();
  const { data: countries } = useListCountries();
  const { data: pricing } = useGetPricing();
  const symbol = pricing?.currencySymbol ?? "৳";
  const [success, setSuccess] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState(1);

  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", degree: "",
    departmentId: "", specialtyId: "", locationId: "",
    countryId: "", cityId: "",
    chamberAddress: "", visitingTime: "", consultationFee: "",
    bmdcNumber: "", bmdcValidityYears: "", about: "", education: "",
  });

  const { data: cities } = useListCities(
    form.countryId ? { countryId: Number(form.countryId) } : {},
  );

  const specialtiesArr = Array.isArray(specialties) ? specialties : [];
  const [filteredSpecialties, setFilteredSpecialties] = useState(specialtiesArr);

  useEffect(() => {
    const arr = Array.isArray(specialties) ? specialties : [];
    if (form.departmentId) {
      setFilteredSpecialties(arr.filter(s => s.departmentId === Number(form.departmentId)));
    } else {
      setFilteredSpecialties(arr);
    }
  }, [form.departmentId, specialties]);

  const years = Number(form.bmdcValidityYears) || 0;
  const { fee: monthlyFee, label } = calcTieredFee(years, symbol, pricing?.doctorSubscriptionTiers);
  const totalPayable = monthlyFee > 0 ? monthlyFee * selectedMonths : 0;
  const isFree = monthlyFee === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      toast({ title: "Please accept the Terms & Conditions to continue.", variant: "destructive" });
      return;
    }
    try {
      await registerMutation.mutateAsync({
        data: {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          degree: form.degree,
          departmentId: form.departmentId ? Number(form.departmentId) : undefined,
          specialtyId: form.specialtyId ? Number(form.specialtyId) : undefined,
          locationId: form.locationId ? Number(form.locationId) : undefined,
          countryId: form.countryId ? Number(form.countryId) : undefined,
          cityId: form.cityId ? Number(form.cityId) : undefined,
          chamberAddress: form.chamberAddress,
          visitingTime: form.visitingTime,
          consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
          bmdcNumber: form.bmdcNumber,
          bmdcValidityYears: years,
          months: monthlyFee > 0 ? selectedMonths : undefined,
          about: form.about,
          education: form.education,
        }
      });
      setSuccess(true);
    } catch {
      toast({ title: "Registration failed", description: "Please check your details and try again.", variant: "destructive" });
    }
  };

  if (success) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-3">Registration Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Your registration is under review. The admin team will verify your BMDC credentials and approve your account.
          </p>

          <Card className="mb-6 text-left">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">What happens next?</p>
                  <ol className="text-sm text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                    <li>Admin reviews and approves your registration</li>
                    <li>You receive a notification once approved</li>
                    <li>Log in to your dashboard using your email & password</li>
                    {totalPayable > 0 && <li>Pay your subscription ({symbol}{totalPayable}) from your profile page to activate your listing</li>}
                  </ol>
                </div>
              </div>
              {totalPayable > 0 && (
                <>
                  <Separator />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-muted-foreground">Subscription due after approval</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <span>{selectedMonths} month{selectedMonths > 1 ? "s" : ""} × {symbol}{monthlyFee}</span>
                    </div>
                    <div className="flex justify-between font-bold text-primary">
                      <span>Total</span>
                      <span>{symbol}{totalPayable}</span>
                    </div>
                  </div>
                </>
              )}
              {isFree && (
                <p className="text-sm text-green-600 font-medium">✓ Your subscription is free — no payment required after approval.</p>
              )}
            </CardContent>
          </Card>

          <Button asChild variant="outline"><Link href="/">Back to Home</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Doctor Registration</h1>
          <p className="text-muted-foreground">Register on our platform to reach patients across Bangladesh</p>
        </div>

        {/* Fee Calculator */}
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="w-full">
                <p className="font-semibold text-sm mb-1">Subscription Fee Structure</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mb-3">
                  {(() => {
                    const [t1, t2, t3] = pricing?.doctorSubscriptionTiers ?? [];
                    return (
                      <>
                        <div className="text-center p-2 bg-background rounded border">
                          <div className="font-bold text-green-600">{t1?.fee ? `${symbol}${t1.fee}/mo` : "Free"}</div>
                          <div className="text-xs text-muted-foreground">BMDC ≤{t1?.maxYears ?? 5} yrs</div>
                        </div>
                        <div className="text-center p-2 bg-background rounded border">
                          <div className="font-bold text-amber-600">{symbol}{t2?.fee ?? 0}/mo</div>
                          <div className="text-xs text-muted-foreground">BMDC {(t1?.maxYears ?? 0) + 1}–{t2?.maxYears ?? 10} yrs</div>
                        </div>
                        <div className="text-center p-2 bg-background rounded border">
                          <div className="font-bold text-red-600">{symbol}{t3?.fee ?? 0}/mo</div>
                          <div className="text-xs text-muted-foreground">BMDC &gt;{t2?.maxYears ?? 10} yrs</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {years > 0 && (
                  <div className="p-2 bg-background rounded border border-primary/30">
                    <span className="text-sm">Your monthly fee: </span>
                    <Badge variant={isFree ? "default" : "secondary"}>{label}</Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Mohammad Ali" />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="01711XXXXXX" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="doctor@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" minLength={6} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>Professional Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Degree(s) *</Label>
                <Input required value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))} placeholder="MBBS, FCPS (Medicine)" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v, specialtyId: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(departments) ? departments : []).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <Select value={form.specialtyId} onValueChange={v => setForm(f => ({ ...f, specialtyId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                    <SelectContent>
                      {filteredSpecialties?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    value={form.countryId}
                    onValueChange={v => setForm(f => ({ ...f, countryId: v, cityId: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(countries) ? countries : []).map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.flag ? `${c.flag} ` : ""}{c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select
                    value={form.cityId}
                    onValueChange={v => setForm(f => ({ ...f, cityId: v }))}
                    disabled={!form.countryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.countryId ? "Select city" : "Select country first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(cities) ? cities : []).map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location / Area</Label>
                  <Select value={form.locationId} onValueChange={v => setForm(f => ({ ...f, locationId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(locations) ? locations : []).map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Consultation Fee (৳)</Label>
                  <Input type="number" min="0" value={form.consultationFee} onChange={e => setForm(f => ({ ...f, consultationFee: e.target.value }))} placeholder="500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Chamber Address</Label>
                <Input value={form.chamberAddress} onChange={e => setForm(f => ({ ...f, chamberAddress: e.target.value }))} placeholder="Hospital/Clinic name, area, city" />
              </div>
              <div className="space-y-2">
                <Label>Visiting Time</Label>
                <Input value={form.visitingTime} onChange={e => setForm(f => ({ ...f, visitingTime: e.target.value }))} placeholder="Sat-Thu: 6PM-9PM" />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>BMDC Information</CardTitle>
              <CardDescription>Your subscription fee is calculated based on BMDC validity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>BMDC Registration Number *</Label>
                  <Input required value={form.bmdcNumber} onChange={e => setForm(f => ({ ...f, bmdcNumber: e.target.value }))} placeholder="BMDC-XXXXX" />
                </div>
                <div className="space-y-2">
                  <Label>BMDC Validity (Years) *</Label>
                  <Input required type="number" min="1" max="30" value={form.bmdcValidityYears} onChange={e => setForm(f => ({ ...f, bmdcValidityYears: e.target.value }))} placeholder="5" />
                </div>
              </div>

              {years > 0 && (
                <Card className="border-primary/20 bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Calculator className="h-4 w-4" />
                      Subscription Calculator
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Monthly fee</span>
                      <Badge variant={isFree ? "default" : "secondary"}>
                        {isFree ? "FREE" : `${symbol}${monthlyFee}/month`}
                      </Badge>
                    </div>

                    {!isFree && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Select subscription duration</Label>
                          <div className="flex flex-wrap gap-2">
                            {MONTH_OPTIONS.map(m => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setSelectedMonths(m)}
                                className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors
                                  ${selectedMonths === m
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border hover:border-primary/50"
                                  }`}
                              >
                                {m} mo
                              </button>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            {monthlyFee} × {selectedMonths} month{selectedMonths > 1 ? "s" : ""}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-0.5">Total Payable (after approval)</div>
                            <div className="text-2xl font-bold text-primary">{symbol}{totalPayable}</div>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Payment is collected after admin approval. Your subscription activates upon payment confirmation.
                        </p>
                      </>
                    )}

                    {isFree && (
                      <p className="text-sm text-green-600 font-medium">
                        ✓ Your subscription is free — no payment required.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>About & Education</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>About (Bio)</Label>
                <Textarea value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} placeholder="Brief professional bio..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Education</Label>
                <Textarea value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} placeholder="MBBS - Dhaka Medical College; FCPS - BCPS (use semicolons to separate)" rows={2} />
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />
          <label htmlFor="agreeTerms" className="flex items-start gap-2 mb-4 cursor-pointer">
            <Checkbox id="agreeTerms" checked={agreeTerms} onCheckedChange={v => setAgreeTerms(v === true)} className="mt-0.5" />
            <span className="text-sm text-muted-foreground">
              I agree to the <span className="font-medium text-foreground">Terms &amp; Conditions</span> and Privacy Policy of QRX. <span className="text-destructive">*</span>
            </span>
          </label>
          <Button type="submit" size="lg" className="w-full" disabled={registerMutation.isPending || !agreeTerms}>
            {registerMutation.isPending ? "Submitting..." : "Submit Registration"}
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-3">
            Already registered? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </PublicLayout>
  );
}
