import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PatientLayout } from "@/components/layout/PatientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Calendar, Droplets, MapPin, Lock, HeartPulse, Globe, Languages, Camera, Loader2, Heart } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";
import { storageUrl, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/storage";

interface PatientProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  address: string;
  country?: string;
  division?: string;
  district?: string;
  area?: string;
  profilePicture?: string;
  emergencyContact?: string;
  nationality?: string;
  preferredLanguage?: string;
  isDonor?: string;
  donorStatus?: string;
  lastDonationDate?: string;
}

const DONOR_STATUSES = [
  { value: "available", label: "Available" },
  { value: "temporarily_unavailable", label: "Temporarily Unavailable" },
  { value: "inactive", label: "Inactive" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["male", "female", "other"];

export default function PatientProfilePage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { uploadFile } = useUpload({ getAuthToken: () => localStorage.getItem("auth_token") });

  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase}/api/patient/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setProfile(data));
  }, [token]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Use JPG, PNG, or WEBP images.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Maximum image size is 5MB.", variant: "destructive" });
      return;
    }
    setUploadingPhoto(true);
    try {
      const res = await uploadFile(file);
      if (!res) throw new Error("upload failed");
      // Save the objectPath to the profile
      const patchRes = await fetch(`${apiBase}/api/patient/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profilePicture: res.objectPath }),
      });
      if (!patchRes.ok) throw new Error("save failed");
      const updated = await patchRes.json();
      setProfile(prev => prev ? { ...prev, profilePicture: updated.profilePicture } : prev);
      toast({ title: t("saved") });
    } catch {
      toast({ title: t("errorGeneric"), variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/patient/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          bloodGroup: profile.bloodGroup,
          address: profile.address,
          country: profile.country,
          division: profile.division,
          district: profile.district,
          area: profile.area,
          emergencyContact: profile.emergencyContact,
          nationality: profile.nationality,
          preferredLanguage: profile.preferredLanguage,
          isDonor: profile.isDonor ?? "false",
          donorStatus: profile.donorStatus ?? "inactive",
          lastDonationDate: profile.lastDonationDate ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProfile(prev => prev ? { ...prev, ...updated } : updated);
      toast({ title: t("saved") });
    } catch {
      toast({ title: t("errorGeneric"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!token) return;
    if (newPw !== confirmPw) { toast({ title: t("passwordsDoNotMatch"), variant: "destructive" }); return; }
    if (newPw.length < 6) { toast({ title: t("passwordMin"), variant: "destructive" }); return; }
    setChangingPw(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      toast({ title: t("passwordChanged") });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      toast({ title: msg.includes("incorrect") ? t("currentPasswordWrong") : t("passwordChangeFailed"), variant: "destructive" });
    } finally {
      setChangingPw(false);
    }
  };

  if (!profile) return (
    <PatientLayout>
      <p className="text-muted-foreground">{t("loading")}</p>
    </PatientLayout>
  );

  const avatarUrl = storageUrl(profile.profilePicture);

  return (
    <PatientLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">{t("myProfile")}</h1>
          <p className="text-muted-foreground text-sm">{t("profileDesc")}</p>
        </div>

        {/* Profile Photo */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4" />{t("profilePicture")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile.name} className="h-20 w-20 rounded-full object-cover border-2 border-border" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{profile.name}</p>
                <p className="text-xs text-muted-foreground">{t("email")}: {profile.email}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5" />
                  {avatarUrl ? "Change Photo" : "Upload Photo"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <p className="text-xs text-muted-foreground">JPG, PNG or WEBP · max 5MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />{t("accountInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("name")}</Label>
                <Input value={profile.name || ""} onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("email")}</Label>
                <Input value={profile.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{t("phone")}</Label>
                <Input placeholder="+880..." value={profile.phone || ""} onChange={e => setProfile(p => p ? { ...p, phone: e.target.value } : p)} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{t("dateOfBirth")}</Label>
                <Input type="date" value={profile.dateOfBirth || ""} onChange={e => setProfile(p => p ? { ...p, dateOfBirth: e.target.value } : p)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gender")}</Label>
                <Select value={profile.gender || ""} onValueChange={v => setProfile(p => p ? { ...p, gender: v } : p)}>
                  <SelectTrigger><SelectValue placeholder={t("selectGender")} /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => <SelectItem key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" />{t("bloodGroup")}</Label>
                <Select value={profile.bloodGroup || ""} onValueChange={v => setProfile(p => p ? { ...p, bloodGroup: v } : p)}>
                  <SelectTrigger><SelectValue placeholder={t("selectBloodGroup")} /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><HeartPulse className="h-3.5 w-3.5" />{t("emergencyContact")}</Label>
                <Input placeholder="+880..." value={profile.emergencyContact || ""} onChange={e => setProfile(p => p ? { ...p, emergencyContact: e.target.value } : p)} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{t("nationality")}</Label>
                <Input value={profile.nationality || ""} onChange={e => setProfile(p => p ? { ...p, nationality: e.target.value } : p)} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" />{t("preferredLanguage")}</Label>
                <Input value={profile.preferredLanguage || ""} onChange={e => setProfile(p => p ? { ...p, preferredLanguage: e.target.value } : p)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("country")}</Label>
                <Input value={profile.country || ""} onChange={e => setProfile(p => p ? { ...p, country: e.target.value } : p)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("division")}</Label>
                <Input value={profile.division || ""} onChange={e => setProfile(p => p ? { ...p, division: e.target.value } : p)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("district")}</Label>
                <Input value={profile.district || ""} onChange={e => setProfile(p => p ? { ...p, district: e.target.value } : p)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("area")}</Label>
                <Input value={profile.area || ""} onChange={e => setProfile(p => p ? { ...p, area: e.target.value } : p)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t("address")}</Label>
              <Input placeholder="Your address..." value={profile.address || ""} onChange={e => setProfile(p => p ? { ...p, address: e.target.value } : p)} />
            </div>
            <Button onClick={handleSave} disabled={saving}>{saving ? t("saving") : t("saveChanges")}</Button>
          </CardContent>
        </Card>

        {/* Blood Donation */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-red-500" />Blood Donation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Become a Blood Donor</Label>
                <p className="text-xs text-muted-foreground">
                  Allow others to find you and request blood. Your phone number stays private until you accept.
                </p>
              </div>
              <Switch
                checked={profile.isDonor === "true"}
                onCheckedChange={v => setProfile(p => p ? { ...p, isDonor: v ? "true" : "false", donorStatus: v ? "available" : "inactive" } : p)}
              />
            </div>

            {profile.isDonor === "true" && (
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label>Donor Status</Label>
                  <Select
                    value={profile.donorStatus ?? "available"}
                    onValueChange={v => setProfile(p => p ? { ...p, donorStatus: v } : p)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DONOR_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Last Donation Date</Label>
                  <Input
                    type="date"
                    value={profile.lastDonationDate ?? ""}
                    onChange={e => setProfile(p => p ? { ...p, lastDonationDate: e.target.value } : p)}
                  />
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving}>{saving ? t("saving") : t("saveChanges")}</Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />{t("changePassword")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("currentPassword")}</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("newPassword")}</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("confirmPassword")}</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
            </div>
            <Button variant="outline" onClick={handlePasswordChange} disabled={changingPw}>
              {changingPw ? t("saving") : t("changePassword")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PatientLayout>
  );
}
