import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegisterPatient } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [isLoading, setIsLoading] = useState(false);
  const register = useRegisterPatient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast({ title: t("fillRequired"), variant: "destructive" }); return;
    }
    if (form.password.length < 6) {
      toast({ title: t("passwordMin"), variant: "destructive" }); return;
    }
    setIsLoading(true);
    try {
      const result = await register.mutateAsync({ data: form });
      if (result.token) {
        localStorage.setItem("auth_token", result.token);
      }
      await login({ email: form.email, password: form.password });
      toast({ title: t("accountCreated"), description: t("welcomeQrx") });
      setLocation("/");
    } catch (err: any) {
      const msg = err?.response?.data?.error || t("registrationFailed");
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Stethoscope className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{t("createAnAccount")}</h1>
            <p className="text-muted-foreground mt-1">{t("registerSubtitle")}</p>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("signUp")}</CardTitle>
              <CardDescription>{t("signUpDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("fullName")} <span className="text-destructive">*</span></Label>
                  <Input id="name" placeholder={t("fullNamePlaceholder")} value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("emailAddress")} <span className="text-destructive">*</span></Label>
                  <Input id="email" type="email" placeholder="you@email.com" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("phone")} <span className="text-muted-foreground text-xs">{t("optional")}</span></Label>
                  <Input id="phone" placeholder="+880 1XXX XXXXXX" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("password")} <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input id="password" type={showPw ? "text" : "password"} placeholder={t("min6chars")}
                      value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="pr-10" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPw(v => !v)}>
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2 mt-2" disabled={isLoading}>
                  <UserPlus className="h-4 w-4" />
                  {isLoading ? t("creatingAccount") : t("createAccount")}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {t("alreadyHaveAccount")}{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">{t("signInLink")}</Link>
              </div>
              <div className="mt-2 text-center text-sm text-muted-foreground">
                {t("areYouDoctor")}{" "}
                <Link href="/doctor-register" className="font-medium text-primary hover:underline">{t("registerAsDoctor")}</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
