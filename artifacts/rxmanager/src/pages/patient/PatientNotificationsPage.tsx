import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PatientLayout } from "@/components/layout/PatientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";

interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function PatientNotificationsPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  const load = () => {
    if (!token) return;
    fetch(`${apiBase}/api/patient/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setNotifications(data.notifications || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const markRead = async (id: number) => {
    if (!token) return;
    await fetch(`${apiBase}/api/patient/notifications/${id}/read`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    if (!token) return;
    await fetch(`${apiBase}/api/patient/notifications/read-all`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {t("notifications")}
              {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
            </h1>
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={markAllRead}>
              <Check className="h-3.5 w-3.5" />{t("markAsRead")}
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("loading")}</p>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t("noNotificationsYet")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <Card key={n.id} className={n.isRead ? "" : "border-primary/40 bg-primary/5"}>
                <CardContent className="flex items-start justify-between gap-3 pt-4 pb-4">
                  <div>
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.isRead && (
                    <Button size="sm" variant="ghost" className="text-xs h-7 shrink-0" onClick={() => markRead(n.id)}>{t("markAsRead")}</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
