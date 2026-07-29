import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Users, ClipboardPlus, CreditCard, Pill, Calendar, Star, Mail, FileText,
  Building, List, MapPin, Image as ImageIcon, Settings, Megaphone, ClipboardList,
  ShieldCheck, Database, Activity, LayoutDashboard, Newspaper, Link2, Calculator,
  ShoppingBag, SlidersHorizontal,
} from "lucide-react";

const sections = [
  {
    group: "Overview",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, desc: "Platform stats & metrics" },
      { name: "Patient Timeline", href: "/admin/patient-timeline", icon: Activity, desc: "Full history by patient" },
    ],
  },
  {
    group: "Doctors & Patients",
    items: [
      { name: "All Doctors", href: "/admin/doctors", icon: Users, desc: "Manage all doctors" },
      { name: "Pending Approvals", href: "/admin/pending-doctors", icon: ClipboardPlus, desc: "Verify BMDC registrations" },
      { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard, desc: "Subscription fees & status" },
      { name: "Appointments", href: "/admin/appointments", icon: Calendar, desc: "All bookings" },
      { name: "Prescriptions", href: "/admin/prescriptions", icon: ClipboardList, desc: "Repository & export" },
    ],
  },
  {
    group: "Content",
    items: [
      { name: "Banners", href: "/admin/banners", icon: ImageIcon, desc: "Homepage banners" },
      { name: "Image Sliders", href: "/admin/sliders", icon: SlidersHorizontal, desc: "Homepage slideshows" },
      { name: "Advertisements", href: "/admin/advertisements", icon: Megaphone, desc: "Promotional ad blocks" },
      { name: "Medicines", href: "/admin/medicines", icon: Pill, desc: "Medicine database" },
      { name: "Reviews", href: "/admin/reviews", icon: Star, desc: "Moderate patient reviews" },
      { name: "Blog", href: "/admin/blog", icon: Newspaper, desc: "Write & publish articles" },
      { name: "Menu Links", href: "/admin/menu-links", icon: Link2, desc: "Custom header/footer links" },
      { name: "Calculator Builder", href: "/admin/calculators", icon: Calculator, desc: "Build health calculators without code" },
    ],
  },
  {
    group: "Taxonomy",
    items: [
      { name: "Departments", href: "/admin/departments", icon: Building, desc: "Medical departments" },
      { name: "Specialties", href: "/admin/specialties", icon: List, desc: "Doctor specialties" },
      { name: "Locations", href: "/admin/locations", icon: MapPin, desc: "Districts & countries" },
    ],
  },
  {
    group: "Shop",
    items: [
      { name: "Shop Management", href: "/admin/shop", icon: ShoppingBag, desc: "Products, orders & shop settings" },
    ],
  },
  {
    group: "Platform & Systems",
    items: [
      { name: "System Settings", href: "/admin/settings", icon: Settings, desc: "SMTP, SMS, QR config" },
      { name: "Email Logs", href: "/admin/email-logs", icon: Mail, desc: "Sent / queued emails" },
      { name: "SMS Logs", href: "/admin/sms-logs", icon: FileText, desc: "Sent / queued SMS" },
      { name: "Data Migration", href: "/admin/migrations", icon: Database, desc: "Import CSV / Excel" },
      { name: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck, desc: "Track all admin actions" },
    ],
  },
];

export default function AdminHubPage() {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t("adminHub")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Master control center for the QRX platform</p>
        </div>

        {sections.map((section) => (
          <div key={section.group}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{section.group}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Card className="cursor-pointer transition-colors hover:border-primary/60 hover:bg-accent/40">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
