import { useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useResetPassword } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope } from "lucide-react";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";
  const resetMut = useResetPassword();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: t("passwordMin"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("passwordsDoNotMatch"), variant: "destructive" });
      return;
    }
    try {
      await resetMut.mutateAsync({ data: { token, newPassword } });
      toast({ title: t("passwordResetSuccess") });
      setLocation("/login");
    } catch {
      toast({ title: t("resetLinkInvalid"), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl">QRX</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
            <CardDescription>{t("resetPasswordDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">{t("resetLinkInvalid")}</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/forgot-password">{t("forgotPassword")}</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new">{t("newPassword")}</Label>
                  <Input id="new" type="password" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">{t("confirmPassword")}</Label>
                  <Input id="confirm" type="password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={resetMut.isPending}>
                  {resetMut.isPending ? t("saving") : t("resetPassword")}
                </Button>
                <div className="text-center text-sm">
                  <Link href="/login" className="text-primary hover:underline">{t("backToLogin")}</Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
