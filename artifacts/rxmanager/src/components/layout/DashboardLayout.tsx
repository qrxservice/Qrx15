import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useListNotifications, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { 
  Stethoscope, LogOut, Menu, LayoutDashboard, Users, Calendar, Settings, 
  ClipboardPlus, Activity, MapPin, List, Building, CreditCard, Image as ImageIcon,
  Bell, UserCheck, MessageSquare, Clock, Star, Mail, FileText, Sun, Moon, Languages,
  ArrowLeft, Pill, ShieldCheck, ClipboardList, Megaphone, Database, Newspaper, Link2, Monitor, ShoppingBag, SlidersHorizontal, Wrench, PhoneCall, Video, Heart, FlaskConical, Send, Ambulance
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetDoctorProfile } from "@workspace/api-client-react";
import { storageUrl } from "@/lib/storage";

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
      className="h-8 px-2 text-xs font-semibold gap-1" aria-label="Toggle language">
      <Languages className="h-3.5 w-3.5" />
      {lang === "en" ? "বাং" : "EN"}
    </Button>
  );
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: "doctor" | "admin" | "assistant";
  hideSidebar?: boolean;
}

export function DashboardLayout({ children, role, hideSidebar = false }: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // Fetch doctor profile for avatar — silently ignored for non-doctor roles
  const { data: doctorProfile } = useGetDoctorProfile();

  const { data: notifData, refetch: refetchNotifs } = useListNotifications({ query: { queryKey: ["notifications"], refetchInterval: 30000, enabled: !!user } });
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== role)) {
      setLocation("/login");
    }
  }, [user, role, isLoading, setLocation]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">{t("loading")}</div>;
  }

  if (hideSidebar) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/doctor/dashboard">
              <Button variant="ghost" size="sm" className="gap-1.5 shrink-0 h-8 px-3 text-sm">
                <ArrowLeft className="h-4 w-4" />
                {t("dashboard")}
              </Button>
            </Link>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <Stethoscope className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm truncate">{user.name}</span>
              <span className="text-xs text-muted-foreground hidden md:inline shrink-0">
                · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <LanguageToggleButton />
            <ThemeToggleButton />
          </div>
        </header>
        <main className="p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    );
  }

  const doctorNavItems = [
    { name: t("dashboard"), href: "/doctor/dashboard", icon: LayoutDashboard },
    { name: t("appointments"), href: "/doctor/appointments", icon: Calendar },
    { name: t("liveQueue"), href: "/doctor/queue", icon: Activity },
    { name: t("newPrescription"), href: "/doctor/new-prescription", icon: ClipboardPlus },
    { name: t("notices"), href: "/doctor/notices", icon: Bell },
    { name: t("availability"), href: "/doctor/availability", icon: Clock },
    { name: "Network", href: "/doctor/friends", icon: UserCheck },
    { name: "Referrals", href: "/doctor/referrals", icon: Send },
    { name: "Consultations", href: "/doctor/consultations", icon: Stethoscope },
    { name: t("messages"), href: "/doctor/chat", icon: MessageSquare },
    { name: t("patients"), href: "/doctor/patients", icon: Users },
    { name: t("assistants"), href: "/doctor/assistants", icon: UserCheck },
    { name: t("dataImport"), href: "/doctor/import", icon: Database },
    { name: t("queueDevices"), href: "/doctor/queue-devices", icon: Monitor },
    { name: "Tools", href: "/doctor/tools", icon: Wrench },
    { name: t("myProfile"), href: "/doctor/profile", icon: Settings },
  ];

  const assistantNavItems = [
    { name: t("dashboard"),             href: "/assistant/dashboard",    icon: LayoutDashboard },
    { name: t("appointments"),          href: "/assistant/appointments", icon: Calendar },
    { name: "Queue Management",         href: "/assistant/queue",        icon: Activity },
    { name: "Patients",                 href: "/assistant/patients",     icon: Users },
    { name: "Investigation Reports",    href: "/assistant/reports",      icon: FlaskConical },
    { name: "Prescription View",        href: "/assistant/prescriptions",icon: FileText },
    { name: t("messages"),              href: "/assistant/messages",     icon: MessageSquare },
    { name: "Profile",                  href: "/assistant/settings",     icon: UserCheck },
  ];

  const adminNavItems = [
    { name: t("adminHub"), href: "/admin/hub", icon: ShieldCheck },
    { name: t("dashboard"), href: "/admin/dashboard", icon: LayoutDashboard },
    { name: t("allDoctors"), href: "/admin/doctors", icon: Users },
    { name: t("pendingApprovals"), href: "/admin/pending-doctors", icon: ClipboardPlus },
    { name: t("subscriptions"), href: "/admin/subscriptions", icon: CreditCard },
    { name: t("medicines"), href: "/admin/medicines", icon: Pill },
    { name: t("appointments"), href: "/admin/appointments", icon: Calendar },
    { name: "Donations", href: "/admin/donations", icon: Heart },
    { name: t("prescriptionRepo"), href: "/admin/prescriptions", icon: ClipboardList },
    { name: t("patientTimeline"), href: "/admin/patient-timeline", icon: Activity },
    { name: t("reviews"), href: "/admin/reviews", icon: Star },
    { name: t("emailLogs"), href: "/admin/email-logs", icon: Mail },
    { name: t("smsLogs"), href: "/admin/sms-logs", icon: FileText },
    { name: t("departments"), href: "/admin/departments", icon: Building },
    { name: t("specialties"), href: "/admin/specialties", icon: List },
    { name: t("locations"), href: "/admin/locations", icon: MapPin },
    { name: t("banners"), href: "/admin/banners", icon: ImageIcon },
    { name: "Image Sliders", href: "/admin/sliders", icon: SlidersHorizontal },
    { name: t("advertisements"), href: "/admin/advertisements", icon: Megaphone },
    { name: t("blog"), href: "/admin/blog", icon: Newspaper },
    { name: t("menuLinks"), href: "/admin/menu-links", icon: Link2 },
    { name: t("dataMigration"), href: "/admin/migrations", icon: Database },
    { name: t("auditLogs"), href: "/admin/audit-logs", icon: ShieldCheck },
    { name: "Queue Displays", href: "/admin/displays", icon: Monitor },
    { name: t("settings"), href: "/admin/settings", icon: Settings },
    { name: t("paymentGateways"), href: "/admin/payment-gateways", icon: CreditCard },
    { name: t("shopManagement"), href: "/admin/shop", icon: ShoppingBag },
    { name: t("toolsManagement"), href: "/admin/tools", icon: Wrench },
    { name: t("emergencyContacts"), href: "/admin/emergency-contacts", icon: PhoneCall },
    { name: "Ambulance Centre", href: "/admin/ambulance", icon: Ambulance },
    { name: "Video Promotions", href: "/admin/video-promotions", icon: Video },
  ];

  const navItems = role === "doctor" ? doctorNavItems : role === "assistant" ? assistantNavItems : adminNavItems;
  const portalTitle = role === "admin" ? "QRX Admin" : role === "assistant" ? "QRX Assistant" : "QRX";
  const shortTitle = role === "admin" ? t("roleAdmin") : role === "assistant" ? t("roleAssistant") : t("roleDoctor");
  const unreadCount = notifData?.unreadCount ?? 0;

  const handleMarkAllRead = async () => {
    await markAllRead.mutateAsync();
    refetchNotifs();
  };

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 hidden flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 text-sidebar-foreground">
            <Stethoscope className="h-6 w-6 text-primary" />
            <span className="font-bold">{portalTitle}</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="grid gap-1 px-4">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <span className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}>
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="p-4 border-t mt-auto">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={storageUrl(doctorProfile?.photoUrl) ?? ""} alt={user.name || "User"} />
              <AvatarFallback className="bg-primary/10 text-primary">{user.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.name || "User"}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            {t("logOut")}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Stethoscope className="h-5 w-5 text-primary" />
            <span className="font-semibold">{shortTitle}</span>
          </div>
          <div className="hidden md:block" />
          {/* Language Toggle */}
          <LanguageToggleButton />
          {/* Theme Toggle */}
          <ThemeToggleButton />
          {/* Notification Bell */}
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
                    <div key={n.id} className={cn("px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors", !n.isRead && "bg-primary/5")}>
                      <div className="flex items-start gap-2">
                        {!n.isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                        <div className={!n.isRead ? "" : "ml-4"}>
                          <p className="text-sm font-medium leading-none">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </header>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="fixed inset-y-0 left-0 w-3/4 max-w-sm border-r bg-background shadow-lg" onClick={e => e.stopPropagation()}>
              <div className="flex h-14 items-center border-b px-6">
                <span className="font-bold flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  {portalTitle}
                </span>
              </div>
              <ScrollArea className="h-[calc(100vh-8rem)] py-4">
                <nav className="grid gap-1 px-4">
                  {navItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                        <span className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                          isActive
                            ? "bg-secondary text-secondary-foreground font-medium"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        )}>
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </ScrollArea>
              <div className="p-4 border-t absolute bottom-0 left-0 right-0 bg-background">
                <Button variant="outline" className="w-full justify-start text-destructive" onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logOut")}
                </Button>
              </div>
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
