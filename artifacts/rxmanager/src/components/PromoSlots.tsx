import { useEffect, useRef, useState, useCallback } from "react";
import { useListBanners, useListAdvertisements, useListAdsenseSlots, useDetectLocation } from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// Viewport / targeting helpers
// ---------------------------------------------------------------------------

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function parseJsonList(raw?: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

interface Targetable {
  targetCountries?: string | null;
  targetDivisions?: string | null;
}

function matchesTargeting(item: Targetable, userCountry?: string, userDivision?: string): boolean {
  const countries = parseJsonList(item.targetCountries);
  if (countries.length > 0 && userCountry) {
    if (!countries.some(c => c.toLowerCase() === userCountry.toLowerCase())) return false;
  }
  const divisions = parseJsonList(item.targetDivisions);
  if (divisions.length > 0 && userDivision) {
    if (!divisions.some(d => d.toLowerCase() === userDivision.toLowerCase())) return false;
  }
  return true;
}

interface Sizable {
  customWidth?: number | null;
  customHeight?: number | null;
  desktopWidth?: number | null;
  desktopHeight?: number | null;
  mobileWidth?: number | null;
  mobileHeight?: number | null;
}

function resolveSize(item: Sizable, isMobile: boolean, fallbackHeightClass: string): {
  style: React.CSSProperties | undefined;
  heightClass: string;
} {
  if (isMobile && item.mobileWidth && item.mobileHeight)
    return { style: { width: item.mobileWidth, height: item.mobileHeight, maxWidth: "100%" }, heightClass: "" };
  if (!isMobile && item.desktopWidth && item.desktopHeight)
    return { style: { width: item.desktopWidth, height: item.desktopHeight, maxWidth: "100%" }, heightClass: "" };
  if (item.customWidth && item.customHeight)
    return { style: { width: item.customWidth, height: item.customHeight, maxWidth: "100%" }, heightClass: "" };
  return { style: undefined, heightClass: fallbackHeightClass };
}

const sizeHeight: Record<string, string> = {
  small: "h-24 sm:h-28",
  medium: "h-36 sm:h-44",
  large: "h-52 sm:h-72",
  custom: "h-36 sm:h-44",
};

// ---------------------------------------------------------------------------
// Analytics tracking
// ---------------------------------------------------------------------------

type PromoKind = "banner" | "advertisement";

function trackEvent(kind: PromoKind, id: number, event: "impression" | "click") {
  const base = kind === "banner" ? "/api/banners" : "/api/advertisements";
  fetch(`${base}/${id}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => {});
}

/** Fires one impression event when the element first scrolls into view (≥50%). */
function useImpressionRef(kind: PromoKind, id: number) {
  const fired = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !fired.current) {
        fired.current = true;
        observer.disconnect();
        trackEvent(kind, id, "impression");
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [kind, id]);

  return ref;
}

// ---------------------------------------------------------------------------
// PromoImage — renders one banner or ad image with tracking
// ---------------------------------------------------------------------------

function PromoImage({
  kind, id, imageUrl, title, linkUrl, heightClass, style,
}: {
  kind: PromoKind;
  id: number;
  imageUrl?: string | null;
  title: string;
  linkUrl?: string | null;
  heightClass: string;
  style?: React.CSSProperties;
}) {
  const containerRef = useImpressionRef(kind, id);
  const handleClick = useCallback(() => trackEvent(kind, id, "click"), [kind, id]);

  if (!imageUrl) return null;

  const img = (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden rounded-xl bg-muted ${heightClass}`}
      style={style}
    >
      <img src={imageUrl} alt={title} className="h-full w-full object-cover" loading="lazy" />
    </div>
  );

  return linkUrl ? (
    <a href={linkUrl} target="_blank" rel="noreferrer" className="block transition-opacity hover:opacity-95" onClick={handleClick}>
      {img}
    </a>
  ) : img;
}

// ---------------------------------------------------------------------------
// Public slots
// ---------------------------------------------------------------------------

/** Renders active banners for a given position, applying targeting and custom sizing. */
export function BannerSlot({ position, className = "" }: { position: string; className?: string }) {
  const { data: banners } = useListBanners({ position });
  const { data: geoData } = useDetectLocation();
  const isMobile = useIsMobile();

  if (!banners?.length) return null;

  const userCountry = (geoData as { countryName?: string })?.countryName;
  const userDivision = (geoData as { region?: string })?.region;

  const filtered = (Array.isArray(banners) ? banners : [])
    .filter(b => matchesTargeting(b, userCountry, userDivision))
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  if (!filtered.length) return null;

  return (
    <div className={`container mx-auto px-4 space-y-3 ${className}`}>
      {filtered.map((b) => {
        const fallback = sizeHeight[b.size ?? "medium"] ?? sizeHeight.medium;
        const { style, heightClass } = resolveSize(b, isMobile, fallback);
        return (
          <PromoImage
            key={b.id}
            kind="banner"
            id={b.id}
            imageUrl={b.imageUrl}
            title={b.title}
            linkUrl={b.linkUrl}
            heightClass={heightClass}
            style={style}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Google AdSense slot — injects raw HTML/JS provided by the admin
// ---------------------------------------------------------------------------

/**
 * Renders an AdSense snippet for a given position.
 * The admin configures the raw AdSense embed code; this component injects it
 * into the page only when the slot is enabled and non-empty.
 */
export function AdsenseSlot({ position, className = "" }: { position: string; className?: string }) {
  const { data: slots } = useListAdsenseSlots();
  const slot = (slots ?? []).find(s => s.position === position);

  if (!slot?.enabled || !slot.code?.trim()) return null;

  return (
    <div
      className={`container mx-auto px-4 ${className}`}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: AdSense code is admin-controlled
      dangerouslySetInnerHTML={{ __html: slot.code }}
    />
  );
}

/** Renders active advertisements for a given location, applying targeting and custom sizing. */
export function AdSlot({ location, className = "" }: { location: string; className?: string }) {
  const { data: ads } = useListAdvertisements({ location });
  const { data: geoData } = useDetectLocation();
  const isMobile = useIsMobile();

  if (!ads?.length) return null;

  const userCountry = (geoData as { countryName?: string })?.countryName;
  const userDivision = (geoData as { region?: string })?.region;

  const filtered = (Array.isArray(ads) ? ads : [])
    .filter(a => matchesTargeting(a, userCountry, userDivision))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  if (!filtered.length) return null;

  return (
    <div className={`container mx-auto px-4 ${className}`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ad) => {
          const { style, heightClass } = resolveSize(ad, isMobile, "h-32 sm:h-36");
          return (
            <PromoImage
              key={ad.id}
              kind="advertisement"
              id={ad.id}
              imageUrl={ad.imageUrl}
              title={ad.title}
              linkUrl={ad.linkUrl}
              heightClass={heightClass}
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
}
