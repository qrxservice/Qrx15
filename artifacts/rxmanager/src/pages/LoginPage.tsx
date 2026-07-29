import { useState } from "react";
import { Link } from "wouter";
import { useAuth, LoginOtpChallenge } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { login, verifyOtp, resendOtp } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState<LoginOtpChallenge | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const challenge = await login({ email, password });
      if (challenge) {
        setOtpChallenge(challenge);
      }
    } catch {
      toast({ title: t("loginFailed"), description: t("invalidCredentials"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpChallenge) return;
    setLoading(true);
    try {
      await verifyOtp(otpChallenge.pendingToken, otpCode);
    } catch {
      toast({ title: "Verification failed", description: "The code is invalid or has expired.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!otpChallenge) return;
    setResending(true);
    try {
      await resendOtp(otpChallenge.pendingToken);
      toast({ title: "Code resent", description: "A new verification code has been sent." });
    } catch {
      toast({ title: "Could not resend code", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  if (otpChallenge) {
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
              <CardTitle className="text-2xl flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Verify Your Identity
              </CardTitle>
              <CardDescription>
                {otpChallenge.otpMethod === "mobile"
                  ? "Enter the verification code sent to your registered mobile number."
                  : "Enter the verification code sent to your email."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || otpCode.length === 0}>
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </Button>
              </form>
              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline disabled:opacity-50"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? "Sending..." : "Resend code"}
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:underline"
                  onClick={() => { setOtpChallenge(null); setOtpCode(""); }}
                >
                  Back to login
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <CardTitle className="text-2xl">{t("signIn")}</CardTitle>
            <CardDescription>{t("signInDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("signingIn") : t("signIn")}
              </Button>
            </form>
            <div className="mt-3 text-center text-sm">
              <Link href="/forgot-password" className="text-primary hover:underline">
                {t("forgotPassword")}
              </Link>
            </div>
            <div className="mt-4 text-center text-sm">
              {t("notRegistered")}{" "}
              <Link href="/doctor-register" className="text-primary hover:underline">
                {t("registerAsDoctor")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
