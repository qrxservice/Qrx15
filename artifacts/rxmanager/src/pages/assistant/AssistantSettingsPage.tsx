import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Mail, User as UserIcon } from "lucide-react";

export default function AssistantSettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <DashboardLayout role="assistant">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" /> {t("settings")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("accountSettingsDesc")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("accountInfo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("name")}:</span>
                <span className="font-medium">{user?.name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("email")}:</span>
                <span className="font-medium">{user?.email ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <ChangePasswordCard />
      </div>
    </DashboardLayout>
  );
}
