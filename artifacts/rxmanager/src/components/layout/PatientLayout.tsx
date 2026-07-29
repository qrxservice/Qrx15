import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useListNotifications, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Stethoscope, LayoutDashboard, Calendar, FileText, User,
  LogOut, Menu, Sun, Moon, Languages, Package, MapPin, Heart, Bell, Droplets, MessageSquare,
} from "lucide-react";

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function LanguageToggleButton() {
  const { lang, setLang } = useLanguage();
  return (
    <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "bn" : "en")}
      className="h-8 px-2 text-xs font-semibold gap-1">
      <Languages className="h-3.5 w-3.5" />
      {lang === "en" ? "বাং" : "EN"}
    </Button>
  );
}

export function PatientLayout({ children }: { children: ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Reuse same notification hook as DashboardLayout — same backend, same table
  const { data: notifData, refetch: refetchNotifs } = useListNotifications({
    query: { queryKey: ["patient-notifications"], refetchInterval: 20000, enabled: !!user },
  });
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifData?.unreadCount ?? 0;

  const handleMarkAllRead = async () => {
    await markAllRead.mutateAsync();
    refetchNotifs();
  };

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "patient")) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">{t("loading")}</div>;
  }

  // Count unread blood chat messages specifically (for Messages badge)
  const unreadChatCount = notifData?.notifications?.filter(
    n => n.type === "blood_chat_message" && !n.isRead
  ).length ?? 0;

  const navItems = [
    { name: t("dashboard"), href: "/patient/dashboard", icon: LayoutDashboard },
    { name: t("myProfile"), href: "/patient/profile", icon: User },
    { name: t("myAppointments"), href: "/patient/appointments", icon: Calendar },
    { name: t("myPrescriptions"), href: "/patient/prescriptions", icon: FileText },
    { name: t("myOrders"), href: "/patient/orders", icon: Package },
    { name: t("savedAddresses"), href: "/patient/addresses", icon: MapPin },
    { name: t("wishlist"), href: "/patient/wishlist", icon: Heart },
    { name: "Blood Requests", href: "/patient/blood-requests", icon: Droplets },
    { name: "Messages", href: "/patient/blood-requests?tab=accepted", icon: MessageSquare },
    { name: t("notifications"), href: "/patient/notifications", icon: Bell },
  ];

  const SidebarContent = () => (
    <>
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 text-sidebar-foreground">
          <Stethoscope className="h-6 w-6 text-primary" />
          <span className="font-bold">QRX</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-1 px-4">
          {navItems.map((item) => {
            // Strip query string for active-state comparison
            const itemPath = item.href.split("?")[0];
            const isActive = location === item.href || location === itemPath;
            const isBell = item.icon === Bell;
            const isMessages = item.icon === MessageSquare;
            const isBloodRequests = item.href === "/patient/blood-requests";

            // Blood Requests badge: non-chat blood notifications
            const bloodNotifs = isBloodRequests
              ? notifData?.notifications?.filter(n =>
                  ["blood_request", "blood_request_accepted", "blood_request_rejected", "emergency_blood_request"].includes(n.type) && !n.isRead
                ).length ?? 0
              : 0;

            return (
              <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                <span className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}>
                  <span className="relative">
                    <item.icon className="h-4 w-4" />
                    {isBell && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  {item.name}
                  {isMessages && unreadChatCount > 0 && (
                    <Badge className="ml-auto h-4 w-4 p-0 text-[9px] flex items-center justify-center bg-primary text-white rounded-full">
                      {unreadChatCount > 9 ? "9+" : unreadChatCount}
                    </Badge>
                  )}
                  {isBloodRequests && bloodNotifs > 0 && (
                    <Badge className="ml-auto h-4 w-4 p-0 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                      {bloodNotifs > 9 ? "9+" : bloodNotifs}
                    </Badge>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm border border-border">
            {user.name?.charAt(0) || "P"}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user.name || "Patient"}</span>
            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("logOut")}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 hidden flex-col border-r bg-sidebar md:flex">
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Stethoscope className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">{t("rolePatient")}</span>
          </div>
          <div className="hidden md:block" />

          <div className="flex items-center gap-1">
            <LanguageToggleButton />
            <ThemeToggleButton />

            {/* Notification Bell — reuses useListNotifications (same hook as DashboardLayout) */}
            <Popover open={showNotifications} onOpenChange={setShowNotifications}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="font-semibold text-sm">{t("notifications")}</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={handleMarkAllRead}>
                      {t("markAllRead")}
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-80">
                  {!notifData?.notifications?.length ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">{t("noNotifications")}</div>
                  ) : (
                    notifData.notifications.map(n => (
                      <div
                        key={n.id}
                        className={cn(
                          "px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer",
                          !n.isRead && "bg-primary/5"
                        )}
                        onClick={() => {
                          // Navigate to blood requests for blood-related notifications
                          if (["blood_request", "blood_request_accepted", "blood_request_rejected", "blood_chat_message"].includes(n.type)) {
                            setLocation("/patient/blood-requests");
                            setShowNotifications(false);
                          }
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {!n.isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                          <div className={!n.isRead ? "" : "ml-4"}>
                            <p className="text-sm font-medium leading-none">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
                <div className="border-t px-4 py-2">
                  <Link href="/patient/notifications" onClick={() => setShowNotifications(false)}>
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                      View all notifications
                    </Button>
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="fixed inset-y-0 left-0 w-3/4 max-w-sm border-r bg-sidebar shadow-lg flex flex-col" onClick={e => e.stopPropagation()}>
              <SidebarContent />
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
