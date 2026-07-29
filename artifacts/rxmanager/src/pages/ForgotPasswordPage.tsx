import { useState } from "react";
import { Link } from "wouter";
import { useForgotPassword } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const forgotMut = useForgotPassword();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotMut.mutateAsync({ data: { email } });
    } catch {
      /* always show generic success to avoid account enumeration */
    } finally {
      setSent(true);
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
            <CardTitle className="text-2xl">{t("forgotPassword")}</CardTitle>
            <CardDescription>{t("forgotPasswordDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <p className="text-sm text-muted-foreground">{t("resetLinkSent")}</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">{t("backToLogin")}</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input id="email" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={forgotMut.isPending}>
                  {forgotMut.isPending ? t("sending") : t("sendResetLink")}
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
