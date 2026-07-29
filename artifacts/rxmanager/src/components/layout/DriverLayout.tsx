import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Ambulance, LayoutDashboard, History, User, LogOut, Menu, TrendingUp, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/driver/dashboard", icon: LayoutDashboard },
  { label: "Trip History", href: "/driver/trips", icon: History },
  { label: "Earnings", href: "/driver/earnings", icon: TrendingUp },
  { label: "Ratings", href: "/driver/ratings", icon: Star },
  { label: "Documents", href: "/driver/documents", icon: FileText },
  { label: "My Profile", href: "/driver/profile", icon: User },
];

function NavLinks({ location, onClick }: { location: string; onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(item => (
        <Link key={item.href} href={item.href} onClick={onClick}>
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
            location === item.href
              ? "bg-red-600 text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}>
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </div>
        </Link>
      ))}
    </nav>
  );
}

export function DriverLayout({ children }: { children: ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "driver")) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Ambulance className="animate-pulse h-8 w-8 text-red-500" /></div>;
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-4 border-b">
        <Ambulance className="h-5 w-5 text-red-600" />
        <span className="font-bold text-sm">Driver Portal</span>
      </div>
      <div className="flex-1 p-3 overflow-y-auto">
        <NavLinks location={location} onClick={() => setMobileOpen(false)} />
      </div>
      <div className="p-3 border-t">
        <div className="px-3 py-1.5 mb-2">
          <p className="text-xs font-medium text-gray-700 truncate">{user.name ?? user.email}</p>
          <p className="text-[10px] text-muted-foreground">Driver</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full gap-2 justify-start text-muted-foreground" onClick={logout}>
          <LogOut className="h-4 w-4" />Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r bg-background shrink-0">
        {sidebar}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-40 border-b bg-background/95 backdrop-blur flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Ambulance className="h-5 w-5 text-red-600" />
            <span className="font-bold text-sm">Driver Portal</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0">{sidebar}</SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
