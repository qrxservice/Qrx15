import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRegisterDriver, VEHICLE_TYPES, type VehicleType } from "@/lib/ambulance-api";
import { Ambulance, ChevronRight, ChevronLeft, User, FileText, Car, MapPin, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Identity", icon: FileText },
  { label: "Licence", icon: FileText },
  { label: "Vehicle", icon: Car },
  { label: "Coverage", icon: MapPin },
];

const DIVISIONS = ["Dhaka", "Chittagong", "Rajshahi", "Khulna", "Barisal", "Sylhet", "Rangpur", "Mymensingh"];

export default function DriverRegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const register = useRegisterDriver();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    // Step 1 — Personal
    name: "", phone: "", email: "", password: "", dateOfBirth: "", address: "",
    profilePhoto: "",
    // Step 2 — Identity
    nidNumber: "", nidPhoto: "", nidBackPhoto: "", selfiePhoto: "",
    // Step 3 — Licence
    licenceNumber: "", licenceExpiry: "", licencePhoto: "",
    // Step 4 — Vehicle
    vehicleType: "basic" as VehicleType,
    registrationNumber: "", vehicleModel: "", vehiclePhoto: "", seatingCapacity: "",
    // Step 5 — Coverage
    division: "", district: "", upazila: "", serviceRadius: "20",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!form.name || !form.phone || !form.email || !form.password) {
        toast({ title: "Please fill in all required fields", variant: "destructive" }); return false;
      }
      if (form.password.length < 6) {
        toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return false;
      }
    }
    if (step === 3 && !form.registrationNumber) {
      toast({ title: "Vehicle registration number is required", variant: "destructive" }); return false;
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = () => {
    if (!validateStep()) return;
    register.mutate(
      {
        name: form.name, email: form.email, password: form.password, phone: form.phone,
        dateOfBirth: form.dateOfBirth, address: form.address, profilePhoto: form.profilePhoto,
        nidNumber: form.nidNumber, nidPhoto: form.nidPhoto, nidBackPhoto: form.nidBackPhoto,
        selfiePhoto: form.selfiePhoto,
        licenceNumber: form.licenceNumber, licenceExpiry: form.licenceExpiry, licencePhoto: form.licencePhoto,
        vehicleType: form.vehicleType, registrationNumber: form.registrationNumber,
        vehicleModel: form.vehicleModel, vehiclePhoto: form.vehiclePhoto,
        seatingCapacity: form.seatingCapacity,
        division: form.division, district: form.district, upazila: form.upazila,
        serviceRadius: form.serviceRadius,
      },
      {
        onSuccess: () => {
          toast({ title: "Registration submitted!", description: "Your application is pending admin approval." });
          navigate("/driver/pending");
        },
        onError: (err: any) => toast({ title: "Registration failed", description: err.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 p-3 bg-red-100 rounded-full w-fit">
            <Ambulance className="h-7 w-7 text-red-600" />
          </div>
          <CardTitle className="text-xl">Register as Ambulance Driver</CardTitle>
          <p className="text-xs text-muted-foreground">Submit your details for admin review</p>
        </CardHeader>

        {/* Step indicator */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  i < step ? "bg-green-500 text-white" :
                  i === step ? "bg-red-600 text-white" :
                  "bg-gray-200 text-gray-500",
                )}>
                  {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn("text-[10px] text-center hidden sm:block", i === step ? "text-red-600 font-medium" : "text-muted-foreground")}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn("absolute hidden")} />
                )}
              </div>
            ))}
          </div>
          <div className="relative mt-1 h-1 bg-gray-200 rounded-full">
            <div
              className="absolute top-0 left-0 h-1 bg-red-500 rounded-full transition-all"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <CardContent className="space-y-4 pt-4">
          {/* Step 1 — Personal Information */}
          {step === 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2"><User className="h-4 w-4" /> Personal Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Full Name *</Label>
                  <Input placeholder="Your full name" value={form.name} onChange={set("name")} />
                </div>
                <div className="space-y-1">
                  <Label>Mobile Number *</Label>
                  <Input placeholder="+880..." value={form.phone} onChange={set("phone")} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email Address *</Label>
                <Input type="email" placeholder="driver@example.com" value={form.email} onChange={set("email")} />
              </div>
              <div className="space-y-1">
                <Label>Password *</Label>
                <Input type="password" placeholder="Minimum 6 characters" value={form.password} onChange={set("password")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
                </div>
                <div className="space-y-1">
                  <Label>Profile Photo URL</Label>
                  <Input placeholder="https://..." value={form.profilePhoto} onChange={set("profilePhoto")} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input placeholder="Your home address" value={form.address} onChange={set("address")} />
              </div>
            </div>
          )}

          {/* Step 2 — Identity Verification */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2"><FileText className="h-4 w-4" /> Identity Verification</h3>
              <div className="space-y-1">
                <Label>National ID (NID) Number</Label>
                <Input placeholder="NID number" value={form.nidNumber} onChange={set("nidNumber")} />
              </div>
              <div className="space-y-1">
                <Label>NID Front Photo URL</Label>
                <Input placeholder="https://... (front side of NID)" value={form.nidPhoto} onChange={set("nidPhoto")} />
              </div>
              <div className="space-y-1">
                <Label>NID Back Photo URL</Label>
                <Input placeholder="https://... (back side of NID)" value={form.nidBackPhoto} onChange={set("nidBackPhoto")} />
              </div>
              <div className="space-y-1">
                <Label>Selfie Verification Photo URL</Label>
                <Input placeholder="https://... (selfie holding NID)" value={form.selfiePhoto} onChange={set("selfiePhoto")} />
              </div>
              <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded p-2">
                📎 Upload photos to an image host and paste the URL here. Accepted: JPG, PNG.
              </p>
            </div>
          )}

          {/* Step 3 — Driving Licence */}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2"><FileText className="h-4 w-4" /> Driving Licence</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Licence Number</Label>
                  <Input placeholder="DL-XXXXXXXX" value={form.licenceNumber} onChange={set("licenceNumber")} />
                </div>
                <div className="space-y-1">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.licenceExpiry} onChange={set("licenceExpiry")} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Licence Photo URL</Label>
                <Input placeholder="https://... (photo of driving licence)" value={form.licencePhoto} onChange={set("licencePhoto")} />
              </div>
            </div>
          )}

          {/* Step 4 — Ambulance Information */}
          {step === 3 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2"><Car className="h-4 w-4" /> Ambulance Information</h3>
              <div className="space-y-1">
                <Label>Ambulance Type *</Label>
                <Select value={form.vehicleType} onValueChange={v => setForm(f => ({ ...f, vehicleType: v as VehicleType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Registration Number *</Label>
                  <Input placeholder="e.g. DHA-1234" value={form.registrationNumber} onChange={set("registrationNumber")} />
                </div>
                <div className="space-y-1">
                  <Label>Vehicle Model</Label>
                  <Input placeholder="e.g. Toyota HiAce" value={form.vehicleModel} onChange={set("vehicleModel")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Seating Capacity</Label>
                  <Input type="number" placeholder="e.g. 2" min="1" value={form.seatingCapacity} onChange={set("seatingCapacity")} />
                </div>
                <div className="space-y-1">
                  <Label>Vehicle Photo URL</Label>
                  <Input placeholder="https://..." value={form.vehiclePhoto} onChange={set("vehiclePhoto")} />
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Coverage */}
          {step === 4 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2"><MapPin className="h-4 w-4" /> Coverage Area</h3>
              <div className="space-y-1">
                <Label>Division</Label>
                <Select value={form.division} onValueChange={v => setForm(f => ({ ...f, division: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>District</Label>
                  <Input placeholder="e.g. Dhaka" value={form.district} onChange={set("district")} />
                </div>
                <div className="space-y-1">
                  <Label>Upazila / Thana</Label>
                  <Input placeholder="e.g. Mirpur" value={form.upazila} onChange={set("upazila")} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Service Radius (km)</Label>
                <Input type="number" placeholder="20" min="1" max="200" value={form.serviceRadius} onChange={set("serviceRadius")} />
                <p className="text-xs text-muted-foreground">Maximum distance you are willing to travel for a pickup</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={back}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={next}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={register.isPending}>
                {register.isPending ? "Submitting…" : "Submit Application"}
              </Button>
            )}
          </div>

          {step === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <a href="/login" className="text-red-600 hover:underline">Login</a>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
