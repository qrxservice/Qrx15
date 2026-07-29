import { useState } from "react";
import { useChangePassword } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

export function ChangePasswordCard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const changeMut = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
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
      await changeMut.mutateAsync({ data: { currentPassword, newPassword } });
      toast({ title: t("passwordChanged") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: err?.message?.includes("401") || err?.message?.includes("400")
          ? t("currentPasswordWrong")
          : t("passwordChangeFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> {t("changePassword")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">{t("currentPassword")}</Label>
            <Input id="cp-current" type="password" value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">{t("newPassword")}</Label>
            <Input id="cp-new" type="password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">{t("confirmPassword")}</Label>
            <Input id="cp-confirm" type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={changeMut.isPending}>
            {changeMut.isPending ? t("saving") : t("changePassword")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
