import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey,
  useGetAppSettings, useUpdateAppSettings, getGetAppSettingsQueryKey,
  useAdminResetPassword,
  useListAdsenseSlots, useUpdateAdsenseSlot, getListAdsenseSlotsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@workspace/object-storage-web";
import { storageUrl, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import { Mail, MessageSquare, Settings, QrCode, KeyRound, Megaphone, Image as ImageIcon, Loader2, Palette, CreditCard, BarChart2, ShieldCheck, AlignLeft, ChevronDown } from "lucide-react";

const THEME_DEFAULTS = {
  themeColorsEnabled: false,
  themePrimaryLight: "#0d9488", themePrimaryDark: "#2dd4bf",
  themeBgLight: "#ffffff", themeBgDark: "#0f172a",
  doctorCardLight: "#0d9488", doctorCardDark: "#2dd4bf",
};

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-9 w-12 rounded border bg-background p-1" />
        <Input value={value} onChange={e => onChange(e.target.value)} className="flex-1" />
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: adminSettings } = useGetAdminSettings();
  const { data: appSettings } = useGetAppSettings();

  const updateAdminSettings = useUpdateAdminSettings({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() }) },
  });
  const updateAppSettings = useUpdateAppSettings({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAppSettingsQueryKey() }) },
  });
  const adminResetMut = useAdminResetPassword();

  // AdSense slots
  const { data: adsenseSlots } = useListAdsenseSlots();
  const updateAdsenseSlot = useUpdateAdsenseSlot({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdsenseSlotsQueryKey() }) },
  });

  const ADSENSE_POSITIONS = [
    { key: "homepage_hero",   label: "Homepage — Hero" },
    { key: "homepage_middle", label: "Homepage — Middle" },
    { key: "homepage_bottom", label: "Homepage — Bottom" },
    { key: "doctor_listing",  label: "Doctor Listing" },
    { key: "doctor_detail",   label: "Doctor Detail" },
    { key: "blog_detail",     label: "Blog Detail" },
    { key: "sidebar",         label: "Sidebar" },
  ] as const;

  // Local draft state: code per position — only populated once server data arrives.
  const [adsenseDraft, setAdsenseDraft] = useState<Record<string, string> | null>(null);
  // Track pending save per position (separate from global mutation pending)
  const [adsensePending, setAdsensePending] = useState<Record<string, boolean>>({});
  // Accordion: which slot is currently expanded (null = all collapsed)
  const [openAdsenseSlot, setOpenAdsenseSlot] = useState<string | null>(null);

  useEffect(() => {
    // Populate draft only on first load so user edits aren't wiped on re-fetch.
    if (adsenseSlots && adsenseDraft === null) {
      const draft: Record<string, string> = {};
      for (const s of adsenseSlots) draft[s.position] = s.code ?? "";
      setAdsenseDraft(draft);
    }
  }, [adsenseSlots, adsenseDraft]);

  const handleSaveAdsenseSlot = async (position: string) => {
    const slot = (adsenseSlots ?? []).find(s => s.position === position);
    const code = adsenseDraft?.[position] ?? slot?.code ?? "";
    setAdsensePending(p => ({ ...p, [position]: true }));
    try {
      await updateAdsenseSlot.mutateAsync({
        position,
        data: { code, enabled: slot?.enabled ?? false },
      });
      toast({ title: "AdSense slot saved" });
    } catch {
      toast({ title: "Failed to save slot", variant: "destructive" });
    } finally {
      setAdsensePending(p => ({ ...p, [position]: false }));
    }
  };

  const handleToggleAdsenseSlot = async (position: string, enabled: boolean) => {
    const slot = (adsenseSlots ?? []).find(s => s.position === position);
    const code = adsenseDraft?.[position] ?? slot?.code ?? "";
    setAdsensePending(p => ({ ...p, [position]: true }));
    try {
      await updateAdsenseSlot.mutateAsync({ position, data: { code, enabled } });
      toast({ title: enabled ? "AdSense slot enabled" : "AdSense slot disabled" });
    } catch {
      toast({ title: "Failed to toggle slot", variant: "destructive" });
    } finally {
      setAdsensePending(p => ({ ...p, [position]: false }));
    }
  };

  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");

  const [smtp, setSmtp] = useState({
    smtpHost: "", smtpPort: "587", smtpUser: "", smtpPassword: "",
    smtpFromEmail: "", smtpFromName: "", smtpEnabled: false,
  });
  const [sms, setSms] = useState({ smsProvider: "", smsApiKey: "", smsSenderId: "", smsEnabled: false });
  const [notice, setNotice] = useState({ text: "", enabled: false });
  const [billing, setBilling] = useState({
    monthlySubscriptionFee: 500, monthlySubscriptionFeeUsd: 5,
    autoApproveOnPayment: false, manualPaymentEnabled: true,
    bdtTier1MaxYears: 5, bdtTier1Fee: 0, bdtTier2MaxYears: 10, bdtTier2Fee: 500, bdtTier3Fee: 1000,
    usdTier1MaxYears: 5, usdTier1Fee: 0, usdTier2MaxYears: 10, usdTier2Fee: 5, usdTier3Fee: 10,
  });
  const [donation, setDonation] = useState({ donationEnabled: false, donationAmount: 100, donationAmountUsd: 1, donationMessage: "" });
  const [twoFactor, setTwoFactor] = useState({
    admin2faEnabled: false, admin2faMethod: "email", admin2faOtpExpiryMinutes: 10,
    admin2faMobileApiUrl: "", admin2faMobileApiKey: "",
  });

  const heroFileRef = useRef<HTMLInputElement | null>(null);
  const logoFileRef = useRef<HTMLInputElement | null>(null);
  const faviconFileRef = useRef<HTMLInputElement | null>(null);
  const footerLogoFileRef = useRef<HTMLInputElement | null>(null);
  const { uploadFile, isUploading } = useUpload({ getAuthToken: () => localStorage.getItem("auth_token") });
  const [hero, setHero] = useState({ imageUrl: "", overlayColor: "#0f172a", overlayOpacity: 40 });
  const [themeColors, setThemeColors] = useState(THEME_DEFAULTS);
  const [branding, setBranding] = useState({ logoUrl: "", logoWidth: 32, logoHeight: 32, faviconUrl: "", footerLogoUrl: "" });
  const [footerContent, setFooterContent] = useState({
    footerSiteName: "", footerTagline: "", footerCopyrightText: "", footerAbout: "",
  });

  useEffect(() => {
    if (appSettings) {
      setNotice({ text: appSettings.noticeText ?? "", enabled: appSettings.noticeEnabled ?? false });
      setHero({
        imageUrl: appSettings.heroImageUrl ?? "",
        overlayColor: appSettings.heroOverlayColor ?? "#0f172a",
        overlayOpacity: appSettings.heroOverlayOpacity ?? 40,
      });
      setBranding({
        logoUrl: appSettings.siteLogoUrl ?? "",
        logoWidth: appSettings.siteLogoWidth ?? 32,
        logoHeight: appSettings.siteLogoHeight ?? 32,
        faviconUrl: appSettings.faviconUrl ?? "",
        footerLogoUrl: appSettings.footerLogoUrl ?? "",
      });
      setFooterContent({
        footerSiteName: appSettings.footerSiteName ?? "",
        footerTagline: appSettings.footerTagline ?? "",
        footerCopyrightText: appSettings.footerCopyrightText ?? "",
        footerAbout: appSettings.footerAbout ?? "",
      });
      setThemeColors({
        themeColorsEnabled: appSettings.themeColorsEnabled ?? false,
        themePrimaryLight: appSettings.themePrimaryLight ?? THEME_DEFAULTS.themePrimaryLight,
        themePrimaryDark: appSettings.themePrimaryDark ?? THEME_DEFAULTS.themePrimaryDark,
        themeBgLight: appSettings.themeBgLight ?? THEME_DEFAULTS.themeBgLight,
        themeBgDark: appSettings.themeBgDark ?? THEME_DEFAULTS.themeBgDark,
        doctorCardLight: appSettings.doctorCardLight ?? THEME_DEFAULTS.doctorCardLight,
        doctorCardDark: appSettings.doctorCardDark ?? THEME_DEFAULTS.doctorCardDark,
      });
    }
  }, [appSettings]);

  const handleSaveThemeColors = async () => {
    try {
      await updateAppSettings.mutateAsync({ data: { ...themeColors } });
      toast({ title: "Theme colors saved", description: themeColors.themeColorsEnabled ? "Custom colors are now live." : "Custom colors disabled — using defaults." });
    } catch { toast({ title: "Failed to save theme colors", variant: "destructive" }); }
  };

  const handleSaveFooterContent = async () => {
    try {
      await updateAppSettings.mutateAsync({ data: { ...footerContent } });
      toast({ title: "Footer settings saved", description: "Changes will appear on the public site immediately." });
    } catch { toast({ title: "Failed to save footer settings", variant: "destructive" }); }
  };

  const handleHeroImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file", description: "Use JPG, PNG, or WEBP images.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Maximum image size is 5MB.", variant: "destructive" });
      return;
    }
    try {
      const res = await uploadFile(file);
      if (!res) throw new Error("upload failed");
      const saved = await updateAppSettings.mutateAsync({ data: { heroImageUrl: res.objectPath } });
      setHero(h => ({ ...h, imageUrl: saved.heroImageUrl ?? "" }));
      toast({ title: "Hero image updated" });
    } catch { toast({ title: "Failed to upload image", variant: "destructive" }); }
  };

  const handleRemoveHeroImage = async () => {
    try {
      await updateAppSettings.mutateAsync({ data: { heroImageUrl: "" } });
      setHero(h => ({ ...h, imageUrl: "" }));
      toast({ title: "Hero image removed" });
    } catch { toast({ title: "Failed to remove image", variant: "destructive" }); }
  };

  const handleSaveHero = async () => {
    try {
      await updateAppSettings.mutateAsync({ data: { heroOverlayColor: hero.overlayColor, heroOverlayOpacity: hero.overlayOpacity } });
      toast({ title: "Homepage hero saved" });
    } catch { toast({ title: "Failed to save hero settings", variant: "destructive" }); }
  };

  async function handleBrandingImageSelect(e: React.ChangeEvent<HTMLInputElement>, field: "logoUrl" | "faviconUrl" | "footerLogoUrl", settingsKey: "siteLogoUrl" | "faviconUrl" | "footerLogoUrl", label: string) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file", description: "Use JPG, PNG, or WEBP images.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Maximum image size is 5MB.", variant: "destructive" });
      return;
    }
    try {
      const res = await uploadFile(file);
      if (!res) throw new Error("upload failed");
      const saved = await updateAppSettings.mutateAsync({ data: { [settingsKey]: res.objectPath } });
      setBranding(b => ({ ...b, [field]: (saved as unknown as Record<string, unknown>)[settingsKey] ?? "" }));
      toast({ title: `${label} updated` });
    } catch { toast({ title: `Failed to upload ${label.toLowerCase()}`, variant: "destructive" }); }
  }

  async function handleRemoveBrandingImage(field: "logoUrl" | "faviconUrl" | "footerLogoUrl", settingsKey: "siteLogoUrl" | "faviconUrl" | "footerLogoUrl", label: string) {
    try {
      await updateAppSettings.mutateAsync({ data: { [settingsKey]: "" } });
      setBranding(b => ({ ...b, [field]: "" }));
      toast({ title: `${label} removed` });
    } catch { toast({ title: `Failed to remove ${label.toLowerCase()}`, variant: "destructive" }); }
  }

  const handleSaveLogoSize = async () => {
    try {
      await updateAppSettings.mutateAsync({ data: { siteLogoWidth: branding.logoWidth, siteLogoHeight: branding.logoHeight } });
      toast({ title: "Logo size saved" });
    } catch { toast({ title: "Failed to save logo size", variant: "destructive" }); }
  };

  const handleSaveNotice = async () => {
    try {
      await updateAppSettings.mutateAsync({ data: { noticeText: notice.text, noticeEnabled: notice.enabled } });
      toast({ title: "Notice saved" });
    } catch { toast({ title: "Failed to save notice", variant: "destructive" }); }
  };

  useEffect(() => {
    if (!adminSettings) return;
    setSmtp({
      smtpHost: adminSettings.smtpHost ?? "",
      smtpPort: adminSettings.smtpPort != null ? String(adminSettings.smtpPort) : "587",
      smtpUser: adminSettings.smtpUser ?? "",
      smtpPassword: "",
      smtpFromEmail: adminSettings.smtpFromEmail ?? "",
      smtpFromName: adminSettings.smtpFromName ?? "",
      smtpEnabled: adminSettings.smtpEnabled,
    });
    setSms({
      smsProvider: adminSettings.smsProvider ?? "",
      smsApiKey: "",
      smsSenderId: adminSettings.smsSenderId ?? "",
      smsEnabled: adminSettings.smsEnabled,
    });
    setBilling({
      monthlySubscriptionFee: adminSettings.monthlySubscriptionFee ?? 500,
      monthlySubscriptionFeeUsd: adminSettings.monthlySubscriptionFeeUsd ?? 5,
      autoApproveOnPayment: adminSettings.autoApproveOnPayment ?? false,
      manualPaymentEnabled: adminSettings.manualPaymentEnabled ?? true,
      bdtTier1MaxYears: adminSettings.bdtTier1MaxYears ?? 5,
      bdtTier1Fee: adminSettings.bdtTier1Fee ?? 0,
      bdtTier2MaxYears: adminSettings.bdtTier2MaxYears ?? 10,
      bdtTier2Fee: adminSettings.bdtTier2Fee ?? 500,
      bdtTier3Fee: adminSettings.bdtTier3Fee ?? 1000,
      usdTier1MaxYears: adminSettings.usdTier1MaxYears ?? 5,
      usdTier1Fee: adminSettings.usdTier1Fee ?? 0,
      usdTier2MaxYears: adminSettings.usdTier2MaxYears ?? 10,
      usdTier2Fee: adminSettings.usdTier2Fee ?? 5,
      usdTier3Fee: adminSettings.usdTier3Fee ?? 10,
    });
    setDonation({
      donationEnabled: adminSettings.donationEnabled ?? false,
      donationAmount: adminSettings.donationAmount ?? 100,
      donationAmountUsd: adminSettings.donationAmountUsd ?? 1,
      donationMessage: adminSettings.donationMessage ?? "",
    });
    setTwoFactor({
      admin2faEnabled: adminSettings.admin2faEnabled ?? false,
      admin2faMethod: adminSettings.admin2faMethod ?? "email",
      admin2faOtpExpiryMinutes: adminSettings.admin2faOtpExpiryMinutes ?? 10,
      admin2faMobileApiUrl: adminSettings.admin2faMobileApiUrl ?? "",
      admin2faMobileApiKey: "",
    });
  }, [adminSettings]);

  const qrEnabled = appSettings?.prescriptionQrEnabled ?? true;

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAdminSettings.mutateAsync({
        data: {
          smtpHost: smtp.smtpHost || undefined,
          smtpPort: smtp.smtpPort ? Number(smtp.smtpPort) : undefined,
          smtpUser: smtp.smtpUser || undefined,
          ...(smtp.smtpPassword ? { smtpPassword: smtp.smtpPassword } : {}),
          smtpFromEmail: smtp.smtpFromEmail || undefined,
          smtpFromName: smtp.smtpFromName || undefined,
          smtpEnabled: smtp.smtpEnabled,
        },
      });
      setSmtp(s => ({ ...s, smtpPassword: "" }));
      toast({ title: "Email settings saved" });
    } catch { toast({ title: "Failed to save email settings", variant: "destructive" }); }
  };

  const handleSaveSms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAdminSettings.mutateAsync({
        data: {
          smsProvider: sms.smsProvider || undefined,
          ...(sms.smsApiKey ? { smsApiKey: sms.smsApiKey } : {}),
          smsSenderId: sms.smsSenderId || undefined,
          smsEnabled: sms.smsEnabled,
        },
      });
      setSms(s => ({ ...s, smsApiKey: "" }));
      toast({ title: "SMS settings saved" });
    } catch { toast({ title: "Failed to save SMS settings", variant: "destructive" }); }
  };

  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAdminSettings.mutateAsync({
        data: {
          donationEnabled: donation.donationEnabled,
          donationAmount: donation.donationAmount,
          donationAmountUsd: donation.donationAmountUsd,
          donationMessage: donation.donationMessage || undefined,
        },
      });
      toast({ title: "Donation settings saved" });
    } catch { toast({ title: "Failed to save donation settings", variant: "destructive" }); }
  };

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (billing.monthlySubscriptionFee < 0 || !Number.isFinite(billing.monthlySubscriptionFee)) {
      toast({ title: "Monthly fee must be a non-negative number", variant: "destructive" });
      return;
    }
    try {
      await updateAdminSettings.mutateAsync({
        data: {
          monthlySubscriptionFee: billing.monthlySubscriptionFee,
          monthlySubscriptionFeeUsd: billing.monthlySubscriptionFeeUsd,
          autoApproveOnPayment: billing.autoApproveOnPayment,
          manualPaymentEnabled: billing.manualPaymentEnabled,
          bdtTier1MaxYears: billing.bdtTier1MaxYears,
          bdtTier1Fee: billing.bdtTier1Fee,
          bdtTier2MaxYears: billing.bdtTier2MaxYears,
          bdtTier2Fee: billing.bdtTier2Fee,
          bdtTier3Fee: billing.bdtTier3Fee,
          usdTier1MaxYears: billing.usdTier1MaxYears,
          usdTier1Fee: billing.usdTier1Fee,
          usdTier2MaxYears: billing.usdTier2MaxYears,
          usdTier2Fee: billing.usdTier2Fee,
          usdTier3Fee: billing.usdTier3Fee,
        },
      });
      toast({ title: "Billing settings saved" });
    } catch { toast({ title: "Failed to save billing settings", variant: "destructive" }); }
  };

  const handleSaveTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactor.admin2faOtpExpiryMinutes < 1 || twoFactor.admin2faOtpExpiryMinutes > 60) {
      toast({ title: "OTP expiry must be between 1 and 60 minutes", variant: "destructive" });
      return;
    }
    try {
      await updateAdminSettings.mutateAsync({
        data: {
          admin2faEnabled: twoFactor.admin2faEnabled,
          admin2faMethod: twoFactor.admin2faMethod,
          admin2faOtpExpiryMinutes: twoFactor.admin2faOtpExpiryMinutes,
          admin2faMobileApiUrl: twoFactor.admin2faMobileApiUrl || undefined,
          ...(twoFactor.admin2faMobileApiKey ? { admin2faMobileApiKey: twoFactor.admin2faMobileApiKey } : {}),
        },
      });
      setTwoFactor(s => ({ ...s, admin2faMobileApiKey: "" }));
      toast({ title: "2-step verification settings saved" });
    } catch { toast({ title: "Failed to save 2-step verification settings", variant: "destructive" }); }
  };

  const handleAdminReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    try {
      await adminResetMut.mutateAsync({ data: { email: resetEmail, newPassword: resetNewPassword } });
      toast({ title: "Password reset successfully" });
      setResetEmail("");
      setResetNewPassword("");
    } catch (err: any) {
      toast({
        title: err?.message?.includes("404") ? "No user with that email" : "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" />System Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform configuration — email, SMS, prescription QR, and user access</p>
        </div>

        {/* Email / SMTP */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />Email (SMTP)</span>
              <Badge variant={adminSettings?.smtpConfigured ? (adminSettings.smtpEnabled ? "default" : "secondary") : "destructive"}>
                {adminSettings?.smtpConfigured ? (adminSettings.smtpEnabled ? "Active" : "Disabled") : "Not configured"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSmtp} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>SMTP Host</Label><Input value={smtp.smtpHost} onChange={e => setSmtp(s => ({ ...s, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" /></div>
                <div className="space-y-1.5"><Label>SMTP Port</Label><Input type="number" value={smtp.smtpPort} onChange={e => setSmtp(s => ({ ...s, smtpPort: e.target.value }))} placeholder="587" /></div>
                <div className="space-y-1.5"><Label>Username</Label><Input value={smtp.smtpUser} onChange={e => setSmtp(s => ({ ...s, smtpUser: e.target.value }))} placeholder="noreply@yourdomain.com" /></div>
                <div className="space-y-1.5">
                  <Label>Password {adminSettings?.smtpConfigured && <span className="text-xs text-muted-foreground">(leave blank to keep)</span>}</Label>
                  <Input type="password" value={smtp.smtpPassword} onChange={e => setSmtp(s => ({ ...s, smtpPassword: e.target.value }))} placeholder="••••••••" autoComplete="new-password" />
                </div>
                <div className="space-y-1.5"><Label>From Email</Label><Input type="email" value={smtp.smtpFromEmail} onChange={e => setSmtp(s => ({ ...s, smtpFromEmail: e.target.value }))} placeholder="noreply@qrx.com.bd" /></div>
                <div className="space-y-1.5"><Label>From Name</Label><Input value={smtp.smtpFromName} onChange={e => setSmtp(s => ({ ...s, smtpFromName: e.target.value }))} placeholder="QRX" /></div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="smtpEnabled" className="flex flex-col gap-0.5">
                  <span>Enable email sending</span>
                  <span className="text-xs font-normal text-muted-foreground">When off, emails are logged only</span>
                </Label>
                <Switch id="smtpEnabled" checked={smtp.smtpEnabled} onCheckedChange={v => setSmtp(s => ({ ...s, smtpEnabled: v }))} />
              </div>
              <Button type="submit" disabled={updateAdminSettings.isPending}>Save Email Settings</Button>
            </form>
          </CardContent>
        </Card>

        {/* SMS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" />SMS</span>
              <Badge variant={adminSettings?.smsConfigured ? (adminSettings.smsEnabled ? "default" : "secondary") : "destructive"}>
                {adminSettings?.smsConfigured ? (adminSettings.smsEnabled ? "Active" : "Disabled") : "Not configured"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSms} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Provider</Label><Input value={sms.smsProvider} onChange={e => setSms(s => ({ ...s, smsProvider: e.target.value }))} placeholder="twilio / infobip / ssl" /></div>
                <div className="space-y-1.5"><Label>Sender ID</Label><Input value={sms.smsSenderId} onChange={e => setSms(s => ({ ...s, smsSenderId: e.target.value }))} placeholder="QRX" /></div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>API Key {adminSettings?.smsConfigured && <span className="text-xs text-muted-foreground">(leave blank to keep)</span>}</Label>
                  <Input type="password" value={sms.smsApiKey} onChange={e => setSms(s => ({ ...s, smsApiKey: e.target.value }))} placeholder="••••••••" autoComplete="new-password" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="smsEnabled" className="flex flex-col gap-0.5">
                  <span>Enable SMS sending</span>
                  <span className="text-xs font-normal text-muted-foreground">When off, messages are logged only</span>
                </Label>
                <Switch id="smsEnabled" checked={sms.smsEnabled} onCheckedChange={v => setSms(s => ({ ...s, smsEnabled: v }))} />
              </div>
              <Button type="submit" disabled={updateAdminSettings.isPending}>Save SMS Settings</Button>
            </form>
          </CardContent>
        </Card>

        {/* Master Admin 2-Step Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Master Admin 2-Step Verification</span>
              <Badge variant={twoFactor.admin2faEnabled ? "default" : "secondary"}>
                {twoFactor.admin2faEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveTwoFactor} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                When enabled, admin accounts must enter a one-time code after their password to sign in.
              </p>
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <Label htmlFor="admin2faEnabled" className="flex flex-col gap-0.5 cursor-pointer">
                  <span>Require 2-step verification for Master Admin login</span>
                  <span className="text-xs font-normal text-muted-foreground">Applies to all accounts with the admin role</span>
                </Label>
                <Switch
                  id="admin2faEnabled"
                  checked={twoFactor.admin2faEnabled}
                  onCheckedChange={v => setTwoFactor(s => ({ ...s, admin2faEnabled: v }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Verification method</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={twoFactor.admin2faMethod}
                    onChange={e => setTwoFactor(s => ({ ...s, admin2faMethod: e.target.value }))}
                  >
                    <option value="email">Email OTP</option>
                    <option value="mobile">Mobile OTP (future-ready)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>OTP expiry (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={twoFactor.admin2faOtpExpiryMinutes}
                    onChange={e => setTwoFactor(s => ({ ...s, admin2faOtpExpiryMinutes: Number(e.target.value) }))}
                  />
                </div>
              </div>
              {twoFactor.admin2faMethod === "mobile" && (
                <div className="grid gap-3 sm:grid-cols-2 p-3 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Mobile OTP is configurable now for future use — plug in your SMS OTP provider's API once ready. Until an admin's phone number and provider are set, mobile OTP will not send and login falls back to failing closed (code will not be delivered).
                  </p>
                  <div className="space-y-1.5">
                    <Label>Mobile OTP API URL</Label>
                    <Input
                      value={twoFactor.admin2faMobileApiUrl}
                      onChange={e => setTwoFactor(s => ({ ...s, admin2faMobileApiUrl: e.target.value }))}
                      placeholder="https://sms-provider.example.com/send"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mobile OTP API Key {adminSettings?.admin2faMobileConfigured && <span className="text-xs text-muted-foreground">(leave blank to keep)</span>}</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={twoFactor.admin2faMobileApiKey}
                      onChange={e => setTwoFactor(s => ({ ...s, admin2faMobileApiKey: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}
              <Button type="submit" disabled={updateAdminSettings.isPending}>Save 2-Step Verification Settings</Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscription Billing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />Subscription Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveBilling} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Configure per-currency monthly fees and doctor registration pricing tiers. The currency is
                auto-detected from the visitor's location (Bangladesh → BDT, everywhere else → USD).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="monthlyFee">Monthly Subscription Fee — BDT (৳)</Label>
                  <Input
                    id="monthlyFee"
                    type="number"
                    min="0"
                    step="50"
                    value={billing.monthlySubscriptionFee}
                    onChange={e => setBilling(b => ({ ...b, monthlySubscriptionFee: Number(e.target.value) }))}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monthlyFeeUsd">Monthly Subscription Fee — USD ($)</Label>
                  <Input
                    id="monthlyFeeUsd"
                    type="number"
                    min="0"
                    step="1"
                    value={billing.monthlySubscriptionFeeUsd}
                    onChange={e => setBilling(b => ({ ...b, monthlySubscriptionFeeUsd: Number(e.target.value) }))}
                    placeholder="5"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Used for self-service subscription pay/renew. Set 0 to make it free.
              </p>

              <Separator className="my-2" />
              <p className="text-xs font-medium text-foreground">Doctor Registration Fee — by BMDC Validity (Years)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">BDT (৳)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Tier 1 up to (years)</Label><Input type="number" min="0" value={billing.bdtTier1MaxYears} onChange={e => setBilling(b => ({ ...b, bdtTier1MaxYears: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Tier 1 Fee</Label><Input type="number" min="0" value={billing.bdtTier1Fee} onChange={e => setBilling(b => ({ ...b, bdtTier1Fee: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Tier 2 up to (years)</Label><Input type="number" min="0" value={billing.bdtTier2MaxYears} onChange={e => setBilling(b => ({ ...b, bdtTier2MaxYears: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Tier 2 Fee</Label><Input type="number" min="0" value={billing.bdtTier2Fee} onChange={e => setBilling(b => ({ ...b, bdtTier2Fee: Number(e.target.value) }))} /></div>
                    <div className="space-y-1 col-span-2"><Label className="text-xs">Tier 3 Fee (above Tier 2 years)</Label><Input type="number" min="0" value={billing.bdtTier3Fee} onChange={e => setBilling(b => ({ ...b, bdtTier3Fee: Number(e.target.value) }))} /></div>
                  </div>
                </div>
                <div className="rounded-lg border p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">USD ($)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Tier 1 up to (years)</Label><Input type="number" min="0" value={billing.usdTier1MaxYears} onChange={e => setBilling(b => ({ ...b, usdTier1MaxYears: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Tier 1 Fee</Label><Input type="number" min="0" value={billing.usdTier1Fee} onChange={e => setBilling(b => ({ ...b, usdTier1Fee: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Tier 2 up to (years)</Label><Input type="number" min="0" value={billing.usdTier2MaxYears} onChange={e => setBilling(b => ({ ...b, usdTier2MaxYears: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Tier 2 Fee</Label><Input type="number" min="0" value={billing.usdTier2Fee} onChange={e => setBilling(b => ({ ...b, usdTier2Fee: Number(e.target.value) }))} /></div>
                    <div className="space-y-1 col-span-2"><Label className="text-xs">Tier 3 Fee (above Tier 2 years)</Label><Input type="number" min="0" value={billing.usdTier3Fee} onChange={e => setBilling(b => ({ ...b, usdTier3Fee: Number(e.target.value) }))} /></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <Label htmlFor="autoApprove" className="flex flex-col gap-0.5 cursor-pointer">
                  <span>Auto-approve doctor on payment</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    When on, recording a payment automatically approves &amp; activates the doctor's profile
                  </span>
                </Label>
                <Switch
                  id="autoApprove"
                  checked={billing.autoApproveOnPayment}
                  onCheckedChange={v => setBilling(b => ({ ...b, autoApproveOnPayment: v }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <Label htmlFor="manualPayment" className="flex flex-col gap-0.5 cursor-pointer">
                  <span>Allow manual payment</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Keep bank transfer / cash / offline payment available alongside online gateways
                  </span>
                </Label>
                <Switch
                  id="manualPayment"
                  checked={billing.manualPaymentEnabled}
                  onCheckedChange={v => setBilling(b => ({ ...b, manualPaymentEnabled: v }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Online gateway configuration (SSLCommerz, bKash, Nagad, Rocket, Bangla QR) lives under{" "}
                <span className="font-medium text-foreground">Payment Gateways</span> in the sidebar.
              </p>
              <Button type="submit" disabled={updateAdminSettings.isPending}>Save Billing Settings</Button>
            </form>
          </CardContent>
        </Card>

        {/* Appointment Donation Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />Appointment Donation Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveDonation} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                When enabled, patients must complete a donation payment before their serial number is generated. Gateway integration is future-ready.
              </p>
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <Label htmlFor="donationEnabled" className="flex flex-col gap-0.5 cursor-pointer">
                  <span>Enable Donation Payment</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Patients must donate before confirming their appointment
                  </span>
                </Label>
                <Switch
                  id="donationEnabled"
                  checked={donation.donationEnabled}
                  onCheckedChange={v => setDonation(d => ({ ...d, donationEnabled: v }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div className="space-y-1.5">
                  <Label htmlFor="donationAmount">Donation Amount — BDT (৳)</Label>
                  <Input
                    id="donationAmount"
                    type="number"
                    min="0"
                    step="10"
                    value={donation.donationAmount}
                    onChange={e => setDonation(d => ({ ...d, donationAmount: Number(e.target.value) }))}
                    placeholder="100"
                    disabled={!donation.donationEnabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="donationAmountUsd">Donation Amount — USD ($)</Label>
                  <Input
                    id="donationAmountUsd"
                    type="number"
                    min="0"
                    step="1"
                    value={donation.donationAmountUsd}
                    onChange={e => setDonation(d => ({ ...d, donationAmountUsd: Number(e.target.value) }))}
                    placeholder="1"
                    disabled={!donation.donationEnabled}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The amount shown to the patient is auto-selected based on their detected country (Bangladesh → BDT, elsewhere → USD).
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="donationMessage">Donation Message</Label>
                <Textarea
                  id="donationMessage"
                  rows={3}
                  value={donation.donationMessage}
                  onChange={e => setDonation(d => ({ ...d, donationMessage: e.target.value }))}
                  placeholder="Your small contribution helps support charitable healthcare services."
                  disabled={!donation.donationEnabled}
                />
              </div>
              <Button type="submit" disabled={updateAdminSettings.isPending}>Save Donation Settings</Button>
            </form>
          </CardContent>
        </Card>

        {/* Prescription QR Toggle */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" />Prescription QR Code</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
              <div className="pr-4">
                <p className="font-medium text-sm">Show QR on printed prescriptions</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Global control. A QR only prints when both this and the doctor's own setting are on.
                </p>
              </div>
              <Switch
                checked={qrEnabled}
                disabled={updateAppSettings.isPending}
                onCheckedChange={v => updateAppSettings.mutate({ data: { prescriptionQrEnabled: v } })}
              />
            </div>

            {/* Template Management */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t">
              <div>
                <p className="font-medium text-sm">Doctor Template Management</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When off, doctors cannot create, edit, or delete prescription templates. Assistants are always blocked regardless.
                </p>
              </div>
              <Switch
                checked={appSettings?.doctorTemplateManagementEnabled ?? true}
                disabled={updateAppSettings.isPending}
                onCheckedChange={v => updateAppSettings.mutate({ data: { doctorTemplateManagementEnabled: v } })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Doctor Dashboard Notice */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" />Doctor Dashboard Notice</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Broadcast a message shown at the top of every doctor's dashboard.</p>
            <Textarea rows={3} value={notice.text} onChange={e => setNotice(n => ({ ...n, text: e.target.value }))} placeholder="e.g. System maintenance on Friday 10 PM–12 AM." />
            <div className="flex items-center justify-between">
              <Label htmlFor="noticeEnabled" className="flex flex-col gap-0.5">
                <span>Show notice to doctors</span>
                <span className="text-xs font-normal text-muted-foreground">When off, the notice is hidden</span>
              </Label>
              <Switch id="noticeEnabled" checked={notice.enabled} onCheckedChange={v => setNotice(n => ({ ...n, enabled: v }))} />
            </div>
            <Button onClick={handleSaveNotice} disabled={updateAppSettings.isPending}>Save Notice</Button>
          </CardContent>
        </Card>

        {/* Homepage Hero Background */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" />Homepage Hero Background</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Set the background image, overlay color, and contrast for the homepage top section.</p>
            {/* Live preview */}
            <div className="relative h-40 rounded-lg overflow-hidden border flex items-center justify-center">
              {storageUrl(hero.imageUrl) ? (
                <img src={storageUrl(hero.imageUrl)} alt="Hero preview" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
              )}
              <div className="absolute inset-0" style={{ backgroundColor: hero.overlayColor, opacity: hero.overlayOpacity / 100 }} />
              <div className="relative text-center px-4">
                <p className="text-xl font-bold text-white">Find the Right Doctor</p>
                <p className="text-sm text-white/85">Live preview of homepage hero</p>
              </div>
            </div>
            <input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeroImageSelect} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => heroFileRef.current?.click()}>
                {isUploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1.5" />}
                {hero.imageUrl ? "Change Image" : "Upload Image"}
              </Button>
              {hero.imageUrl && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={handleRemoveHeroImage}>Remove Image</Button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Overlay color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={hero.overlayColor} onChange={e => setHero(h => ({ ...h, overlayColor: e.target.value }))} className="h-9 w-12 rounded border bg-background p-1" />
                  <Input value={hero.overlayColor} onChange={e => setHero(h => ({ ...h, overlayColor: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Overlay opacity / contrast — {hero.overlayOpacity}%</Label>
                <input type="range" min={0} max={100} value={hero.overlayOpacity} onChange={e => setHero(h => ({ ...h, overlayOpacity: Number(e.target.value) }))} className="w-full accent-primary" />
              </div>
            </div>
            <Button onClick={handleSaveHero} disabled={updateAppSettings.isPending}>Save Hero Settings</Button>
          </CardContent>
        </Card>

        {/* Site Theme Colors */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4 text-primary" />Site Theme Colors</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Customize the site's primary, background, and doctor-card accent colors for both light and dark mode. Applied across the whole site at runtime.</p>
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
              <Label htmlFor="themeColorsEnabled" className="flex flex-col gap-0.5">
                <span>Enable custom theme colors</span>
                <span className="text-xs font-normal text-muted-foreground">When off, the site uses its built-in palette</span>
              </Label>
              <Switch id="themeColorsEnabled" checked={themeColors.themeColorsEnabled} onCheckedChange={v => setThemeColors(c => ({ ...c, themeColorsEnabled: v }))} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Light mode</p>
                <ColorField label="Primary" value={themeColors.themePrimaryLight} onChange={v => setThemeColors(c => ({ ...c, themePrimaryLight: v }))} />
                <ColorField label="Background" value={themeColors.themeBgLight} onChange={v => setThemeColors(c => ({ ...c, themeBgLight: v }))} />
                <ColorField label="Doctor card accent" value={themeColors.doctorCardLight} onChange={v => setThemeColors(c => ({ ...c, doctorCardLight: v }))} />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dark mode</p>
                <ColorField label="Primary" value={themeColors.themePrimaryDark} onChange={v => setThemeColors(c => ({ ...c, themePrimaryDark: v }))} />
                <ColorField label="Background" value={themeColors.themeBgDark} onChange={v => setThemeColors(c => ({ ...c, themeBgDark: v }))} />
                <ColorField label="Doctor card accent" value={themeColors.doctorCardDark} onChange={v => setThemeColors(c => ({ ...c, doctorCardDark: v }))} />
              </div>
            </div>
            <Button onClick={handleSaveThemeColors} disabled={updateAppSettings.isPending}>Save Theme Colors</Button>
          </CardContent>
        </Card>

        {/* Site Branding — Logo, Favicon, Footer Logo */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" />Site Branding</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <p className="text-xs text-muted-foreground">Manage the header logo, browser favicon, and footer logo. Leave any of these empty to keep the default QRX branding.</p>

            {/* Header logo */}
            <div className="space-y-3 pb-5 border-b">
              <Label className="text-sm font-semibold">Header Logo</Label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg border flex items-center justify-center bg-muted/30 shrink-0 overflow-hidden">
                  {storageUrl(branding.logoUrl) ? (
                    <img src={storageUrl(branding.logoUrl)} alt="Logo preview" style={{ width: branding.logoWidth, height: branding.logoHeight, objectFit: "contain" }} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Default</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleBrandingImageSelect(e, "logoUrl", "siteLogoUrl", "Logo")} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => logoFileRef.current?.click()}>
                      {isUploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1.5" />}
                      {branding.logoUrl ? "Change Logo" : "Upload Logo"}
                    </Button>
                    {branding.logoUrl && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveBrandingImage("logoUrl", "siteLogoUrl", "Logo")}>Remove</Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 max-w-md">
                <div className="space-y-1.5">
                  <Label className="text-xs">Width (px)</Label>
                  <Input type="number" min={8} value={branding.logoWidth} onChange={e => setBranding(b => ({ ...b, logoWidth: Number(e.target.value) || 32 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Height (px)</Label>
                  <Input type="number" min={8} value={branding.logoHeight} onChange={e => setBranding(b => ({ ...b, logoHeight: Number(e.target.value) || 32 }))} />
                </div>
              </div>
              <Button size="sm" onClick={handleSaveLogoSize} disabled={updateAppSettings.isPending}>Save Logo Size</Button>
            </div>

            {/* Favicon */}
            <div className="space-y-3 pb-5 border-b">
              <Label className="text-sm font-semibold">Favicon</Label>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg border flex items-center justify-center bg-muted/30 shrink-0 overflow-hidden">
                  {storageUrl(branding.faviconUrl) ? (
                    <img src={storageUrl(branding.faviconUrl)} alt="Favicon preview" className="h-6 w-6 object-contain" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Default</span>
                  )}
                </div>
                <input ref={faviconFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleBrandingImageSelect(e, "faviconUrl", "faviconUrl", "Favicon")} />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => faviconFileRef.current?.click()}>
                    {isUploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1.5" />}
                    {branding.faviconUrl ? "Change Favicon" : "Upload Favicon"}
                  </Button>
                  {branding.faviconUrl && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveBrandingImage("faviconUrl", "faviconUrl", "Favicon")}>Remove</Button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer logo */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Footer Logo</Label>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-lg border flex items-center justify-center bg-muted/30 shrink-0 overflow-hidden">
                  {storageUrl(branding.footerLogoUrl) ? (
                    <img src={storageUrl(branding.footerLogoUrl)} alt="Footer logo preview" className="h-10 w-10 object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Default</span>
                  )}
                </div>
                <input ref={footerLogoFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleBrandingImageSelect(e, "footerLogoUrl", "footerLogoUrl", "Footer logo")} />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => footerLogoFileRef.current?.click()}>
                    {isUploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1.5" />}
                    {branding.footerLogoUrl ? "Change Logo" : "Upload Logo"}
                  </Button>
                  {branding.footerLogoUrl && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveBrandingImage("footerLogoUrl", "footerLogoUrl", "Footer logo")}>Remove</Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Settings */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlignLeft className="h-4 w-4 text-primary" />Footer Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Customize the text shown in the public site footer. Leave any field blank to use the built-in default.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Site Name</Label>
                <Input
                  placeholder="QRX"
                  value={footerContent.footerSiteName}
                  onChange={e => setFooterContent(f => ({ ...f, footerSiteName: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Brand name displayed next to the footer logo.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Tagline / Domain</Label>
                <Input
                  placeholder="QRX.COM.BD"
                  value={footerContent.footerTagline}
                  onChange={e => setFooterContent(f => ({ ...f, footerTagline: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Small text shown beside the site name.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Copyright Text</Label>
              <Input
                placeholder={`© ${new Date().getFullYear()} QRX.COM.BD. All rights reserved.`}
                value={footerContent.footerCopyrightText}
                onChange={e => setFooterContent(f => ({ ...f, footerCopyrightText: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Shown in the center of the footer bar.</p>
            </div>
            <div className="space-y-1.5">
              <Label>About Text <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                rows={3}
                placeholder="A short description of your platform shown below the footer logo…"
                value={footerContent.footerAbout}
                onChange={e => setFooterContent(f => ({ ...f, footerAbout: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Optional paragraph displayed below the site name and tagline.</p>
            </div>
            <Button onClick={handleSaveFooterContent} disabled={updateAppSettings.isPending}>
              Save Footer Settings
            </Button>
          </CardContent>
        </Card>

        {/* Google AdSense */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />Google AdSense Placements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-xs text-muted-foreground">
              Paste your AdSense embed code for each position. Toggle each slot on or off without losing the code.
            </p>
            {adsenseDraft === null ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading AdSense slots…
              </div>
            ) : (
              <div className="rounded-lg border divide-y overflow-hidden">
                {ADSENSE_POSITIONS.map(({ key, label }) => {
                  const slot = (adsenseSlots ?? []).find(s => s.position === key);
                  const enabled = slot?.enabled ?? false;
                  const isPending = !!adsensePending[key];
                  const isOpen = openAdsenseSlot === key;
                  return (
                    <div key={key}>
                      {/* Accordion header row */}
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => setOpenAdsenseSlot(isOpen ? null : key)}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-medium text-sm">{label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${enabled ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                            {enabled ? "On" : "Off"}
                          </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Expanded content */}
                      {isOpen && (
                        <div className="px-4 pb-4 pt-2 space-y-3 bg-muted/20 border-t">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Enable this slot</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</span>
                              <Switch
                                checked={enabled}
                                onCheckedChange={v => handleToggleAdsenseSlot(key, v)}
                                disabled={isPending}
                              />
                            </div>
                          </div>
                          <Textarea
                            id={`adsense-${key}`}
                            rows={4}
                            placeholder={`<!-- Paste AdSense embed code for "${label}" here -->`}
                            value={adsenseDraft[key] ?? ""}
                            onChange={e => setAdsenseDraft(d => d ? { ...d, [key]: e.target.value } : d)}
                            className="font-mono text-xs"
                            disabled={isPending}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveAdsenseSlot(key)}
                            disabled={isPending}
                          >
                            {isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</> : "Save"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Password Reset */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />Reset User Password</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Reset the password for any user (doctor, assistant, or admin) by email. Use this when a user is locked out.
            </p>
            <form onSubmit={handleAdminReset} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">User email</Label>
                <Input id="reset-email" type="email" placeholder="user@email.com"
                  value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reset-pass">New password</Label>
                <Input id="reset-pass" type="text" placeholder="Min 6 characters"
                  value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={adminResetMut.isPending}>
                <KeyRound className="h-4 w-4 mr-1.5" /> Reset
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
