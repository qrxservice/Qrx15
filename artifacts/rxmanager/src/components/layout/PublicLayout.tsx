import { ReactNode, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListMenuItems, useGetAppSettings } from "@workspace/api-client-react";
import type { MenuItem } from "@workspace/api-client-react";
import { Stethoscope, User, LogOut, Menu, ShoppingCart, Sun, Moon, UserPlus, Languages, PhoneCall, Droplets, Ambulance } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storageUrl } from "@/lib/storage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function CustomMenuLink({ item, className }: { item: MenuItem; className: string }) {
  const isExternal = /^https?:\/\//i.test(item.url);
  if (isExternal || item.openInNewTab) {
    return (
      <a href={item.url} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noopener noreferrer" : undefined} className={className}>
        {item.label}
      </a>
    );
  }
  return <Link href={item.url} className={className}>{item.label}</Link>;
}

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { data: menuItems } = useListMenuItems();
  const { data: appSettings } = useGetAppSettings();
  const shopEnabled = appSettings?.shopEnabled !== false;
  const logoUrl = storageUrl(appSettings?.siteLogoUrl);
  const logoWidth = appSettings?.siteLogoWidth ?? 32;
  const logoHeight = appSettings?.siteLogoHeight ?? 32;
  const footerLogoUrl = storageUrl(appSettings?.footerLogoUrl) ?? logoUrl;
  const footerSiteName = appSettings?.footerSiteName || "QRX";
  const footerTagline = appSettings?.footerTagline || "QRX.COM.BD";
  const footerCopyrightText = appSettings?.footerCopyrightText || `© ${new Date().getFullYear()} QRX.COM.BD. All rights reserved.`;
  const footerAbout = appSettings?.footerAbout || "";

  useEffect(() => {
    const faviconUrl = storageUrl(appSettings?.faviconUrl);
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [appSettings?.faviconUrl]);

  const toggleLang = () => setLang(lang === "en" ? "bn" : "en");

  const menuItemsArr = Array.isArray(menuItems) ? menuItems : [];
  const headerItems = menuItemsArr.filter(m => m.location === "header" || m.location === "both");
  const footerItems = menuItemsArr.filter(m => m.location === "footer" || m.location === "both");

  const NavLinks = () => (
    <>
      <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">{t("home")}</Link>
      <Link href="/doctors" className="text-sm font-medium text-foreground hover:text-primary transition-colors">{t("findDoctor")}</Link>
      {shopEnabled && <Link href="/shop" className="text-sm font-medium text-foreground hover:text-primary transition-colors">{t("shop")}</Link>}
      <Link href="/track" className="text-sm font-medium text-foreground hover:text-primary transition-colors">{t("trackQueue")}</Link>
      <Link href="/track-order" className="text-sm font-medium text-foreground hover:text-primary transition-colors">{t("trackOrder")}</Link>
      <Link href="/blood-donors" className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1">
        <Droplets className="h-3.5 w-3.5" />Blood Donors
      </Link>
      <Link href="/ambulance" className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors flex items-center gap-1">
        <Ambulance className="h-3.5 w-3.5" />Ambulance
      </Link>
      <Link href="/emergency" className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors flex items-center gap-1">
        <PhoneCall className="h-3.5 w-3.5" />{t("emergency")}
      </Link>
      <Link href="/blog" className="text-sm font-medium text-foreground hover:text-primary transition-colors">{t("blog")}</Link>
      <Link href="/doctor-register" className="text-sm font-medium text-foreground hover:text-primary transition-colors">{t("forDoctors")}</Link>
      {headerItems.map(item => (
        <CustomMenuLink key={item.id} item={item} className="text-sm font-medium text-foreground hover:text-primary transition-colors" />
      ))}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] sm:w-[300px]">
                <nav className="flex flex-col gap-4 mt-6">
                  <NavLinks />
                  {!user && (
                    <div className="flex flex-col gap-2 mt-2 pt-2 border-t">
                      <Link href="/login" className="text-sm font-medium text-foreground hover:text-primary">{t("login")}</Link>
                      <Link href="/register" className="text-sm font-medium text-primary hover:text-primary/80">{t("createAccount")}</Link>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: logoWidth, height: logoHeight, objectFit: "contain" }} />
              ) : (
                <Stethoscope className="h-6 w-6 text-primary" />
              )}
              <span className="font-bold text-lg hidden sm:inline-block">QRX</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 flex-wrap">
            <NavLinks />
          </nav>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <Button variant="ghost" size="sm" onClick={toggleLang} className="shrink-0 h-8 px-2 text-xs font-semibold gap-1" aria-label="Toggle language">
              <Languages className="h-3.5 w-3.5" />
              {lang === "en" ? "বাংলা" : "EN"}
            </Button>
            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="shrink-0" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Cart icon — only when shop is enabled */}
            {shopEnabled && (
              <Button variant="ghost" size="icon" asChild className="shrink-0">
                <Link href="/shop/cart" aria-label="Cart">
                  <ShoppingCart className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard" className="cursor-pointer">{t("adminDashboard")}</Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === "doctor" && (
                    <DropdownMenuItem asChild>
                      <Link href="/doctor/dashboard" className="cursor-pointer">{t("doctorDashboard")}</Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === "patient" && (
                    <DropdownMenuItem asChild>
                      <Link href="/patient/dashboard" className="cursor-pointer">{t("myDashboard")}</Link>
                    </DropdownMenuItem>
                  )}
                  {shopEnabled && (
                    <DropdownMenuItem asChild>
                      <Link href="/shop/orders" className="cursor-pointer">{t("myOrders")}</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("logOut")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                  <Link href="/login">{t("login")}</Link>
                </Button>
                <Button asChild size="sm" className="gap-1.5">
                  <Link href="/register">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("register")}</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t bg-card py-8 md:py-12 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {footerLogoUrl ? (
                  <img src={footerLogoUrl} alt="Logo" style={{ width: logoWidth, height: logoHeight, objectFit: "contain" }} />
                ) : (
                  <Stethoscope className="h-6 w-6 text-primary" />
                )}
                <span className="font-bold text-lg">{footerSiteName}</span>
                <span className="text-xs text-muted-foreground">{footerTagline}</span>
              </div>
              {footerAbout && (
                <p className="text-sm text-muted-foreground max-w-xs">{footerAbout}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{footerCopyrightText}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/doctors" className="text-sm text-muted-foreground hover:text-foreground">{t("findDoctor")}</Link>
              {shopEnabled && <Link href="/shop" className="text-sm text-muted-foreground hover:text-foreground">{t("shop")}</Link>}
              <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">{t("blog")}</Link>
              <Link href="/doctor-register" className="text-sm text-muted-foreground hover:text-foreground">{t("forDoctors")}</Link>
              <Link href="/track" className="text-sm text-muted-foreground hover:text-foreground">{t("trackQueue")}</Link>
              {footerItems.map(item => (
                <CustomMenuLink key={item.id} item={item} className="text-sm text-muted-foreground hover:text-foreground" />
              ))}
            </div>
          </div>
          {/* Theme toggle in footer */}
          <div className="flex justify-center pt-4 border-t">
            <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2 text-xs">
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {theme === "dark" ? t("switchToLight") : t("switchToDark")}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
