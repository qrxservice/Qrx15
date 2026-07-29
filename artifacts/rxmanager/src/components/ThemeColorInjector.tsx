import { useEffect } from "react";
import { useGetAppSettings } from "@workspace/api-client-react";
import { useTheme } from "@/contexts/ThemeContext";

// Convert a hex color (#rgb or #rrggbb) to the "H S% L%" triplet that the
// project's CSS variables expect (e.g. "186 100% 36%"). Returns null on bad input.
function hexToHslTriplet(hex: string): string | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let hue = 0, sat = 0;
  if (d !== 0) {
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4; break;
    }
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(l * 100)}%`;
}

// Primary color drives buttons, links, rings, sidebar accents and chart-1.
const PRIMARY_VARS = ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring", "--chart-1"];
const ALL_VARS = [...PRIMARY_VARS, "--background", "--doctor-card"];

// Applies admin-configured theme colors at runtime by overriding CSS variables on
// the document root. Inline styles override both :root and .dark stylesheet rules,
// so we re-apply the correct value whenever the active light/dark mode changes.
export function ThemeColorInjector() {
  const { theme } = useTheme();
  const { data: settings } = useGetAppSettings();

  useEffect(() => {
    const root = document.documentElement;
    const setOrClear = (vars: string[], value: string | null) => {
      if (value) vars.forEach(v => root.style.setProperty(v, value));
      else vars.forEach(v => root.style.removeProperty(v));
    };

    if (!settings || !settings.themeColorsEnabled) {
      ALL_VARS.forEach(v => root.style.removeProperty(v));
      return;
    }

    const isDark = theme === "dark";
    const primary = isDark ? settings.themePrimaryDark : settings.themePrimaryLight;
    const bg = isDark ? settings.themeBgDark : settings.themeBgLight;
    const card = isDark ? settings.doctorCardDark : settings.doctorCardLight;

    setOrClear(PRIMARY_VARS, primary ? hexToHslTriplet(primary) : null);
    setOrClear(["--background"], bg ? hexToHslTriplet(bg) : null);
    setOrClear(["--doctor-card"], card ? hexToHslTriplet(card) : null);
  }, [settings, theme]);

  return null;
}
