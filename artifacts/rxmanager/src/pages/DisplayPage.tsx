import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "wouter";
import { useDisplaySocket } from "@/hooks/useDisplaySocket";
import { Wifi, WifiOff, Volume2, VolumeX, Activity } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NextPatient {
  serialNo: number;
  patientName: string;
}

interface DisplayData {
  deviceId: number;
  deviceName: string;
  doctorId: number;
  doctorName: string | null;
  chamberAddress: string | null;
  showPatientName: boolean;
  showDoctorName: boolean;
  voiceEnabled: boolean;
  voiceLanguage: string;
  theme: string;
  fontSize: number;
  layoutSize: number;
  currentSerial: number | null;
  currentPatientName: string | null;
  nextSerial: number | null;
  nextPatients: NextPatient[];
  totalWaiting: number;
  totalCompleted: number;
  totalToday: number;
  doctorStatus: string;
  breakUntil: string | null;
  logoUrl: string | null;
}

// ─── Voice Announcement ─────────────────────────────────────────────────────

function announce(serial: number, chamber: string | null, lang: string) {
  if (!("speechSynthesis" in window)) return;
  const chamberText = chamber ? chamber : "the chamber";
  const text =
    lang === "bn"
      ? `সিরিয়াল নম্বর ${serial}, অনুগ্রহ করে ${chamberText}-এ আসুন।`
      : `Patient serial ${serial}, please proceed to ${chamberText}.`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// ─── Theme helpers ──────────────────────────────────────────────────────────

const themes = {
  dark: {
    bg: "bg-slate-900",
    header: "bg-slate-800 border-slate-700",
    card: "bg-gradient-to-br from-teal-900/40 to-slate-900",
    cardBreak: "bg-gradient-to-br from-amber-900/40 to-slate-900",
    sidebar: "bg-slate-800 border-slate-700",
    serialColor: "text-teal-400",
    accent: "text-teal-400",
    muted: "text-slate-400",
    subMuted: "text-slate-500",
    body: "text-white",
    nextFirst: "bg-teal-900/40 border border-teal-700/50",
    nextRest: "bg-slate-700/50",
    nextFirstNum: "bg-teal-500 text-slate-900",
    nextRestNum: "bg-slate-600 text-slate-300",
    divider: "border-slate-700",
    badge: "bg-slate-700 text-slate-300",
  },
  light: {
    bg: "bg-gray-50",
    header: "bg-white border-gray-200",
    card: "bg-gradient-to-br from-teal-50 to-gray-50",
    cardBreak: "bg-gradient-to-br from-amber-50 to-gray-50",
    sidebar: "bg-white border-gray-200",
    serialColor: "text-teal-600",
    accent: "text-teal-600",
    muted: "text-gray-500",
    subMuted: "text-gray-400",
    body: "text-gray-900",
    nextFirst: "bg-teal-50 border border-teal-200",
    nextRest: "bg-gray-100",
    nextFirstNum: "bg-teal-500 text-white",
    nextRestNum: "bg-gray-300 text-gray-700",
    divider: "border-gray-200",
    badge: "bg-gray-100 text-gray-600",
  },
  teal: {
    bg: "bg-teal-950",
    header: "bg-teal-900 border-teal-800",
    card: "bg-gradient-to-br from-teal-800/60 to-teal-950",
    cardBreak: "bg-gradient-to-br from-amber-900/40 to-teal-950",
    sidebar: "bg-teal-900 border-teal-800",
    serialColor: "text-white",
    accent: "text-teal-300",
    muted: "text-teal-300",
    subMuted: "text-teal-400",
    body: "text-white",
    nextFirst: "bg-teal-800/60 border border-teal-600/50",
    nextRest: "bg-teal-900/60",
    nextFirstNum: "bg-white text-teal-900",
    nextRestNum: "bg-teal-700 text-white",
    divider: "border-teal-800",
    badge: "bg-teal-800 text-teal-200",
  },
} as const;

type ThemeKey = keyof typeof themes;

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DisplayPage() {
  const params = useParams<{ deviceId: string }>();
  const deviceId = params.deviceId ? parseInt(params.deviceId) : null;

  const [data, setData] = useState<DisplayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(new Date());
  const lastCalledSerial = useRef<number | null>(null);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Prevent scrollbars / body scroll for kiosk mode
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`/api/display/${deviceId}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Display device not found." : "Failed to load display.");
        return;
      }
      const json = (await res.json()) as DisplayData;
      setData(json);
      setError(null);
    } catch {
      setError("Connection error — retrying…");
    }
  }, [deviceId]);

  // Initial load + poll every 30s as fallback
  useEffect(() => {
    void fetchData();
    const t = setInterval(fetchData, 30_000);
    return () => clearInterval(t);
  }, [fetchData]);

  const handleUpdate = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  const handleCalled = useCallback(
    (_: { doctorId: number }) => {
      // Fetch fresh data first, then announce
      fetchData().then(() => {
        setData((prev) => {
          if (
            prev?.voiceEnabled &&
            prev.currentSerial != null &&
            prev.currentSerial !== lastCalledSerial.current
          ) {
            lastCalledSerial.current = prev.currentSerial;
            announce(prev.currentSerial, prev.chamberAddress, prev.voiceLanguage);
          }
          return prev;
        });
      });
    },
    [fetchData],
  );

  useDisplaySocket(data?.doctorId ?? null, {
    onUpdate: handleUpdate,
    onCalled: handleCalled,
    onConnect: () => setConnected(true),
    onDisconnect: () => setConnected(false),
  });

  // ── Derived state ──
  const theme = themes[(data?.theme as ThemeKey) ?? "dark"] ?? themes.dark;
  const t = theme;

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-BD", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const breakUntilDate = data?.breakUntil ? new Date(data.breakUntil) : null;
  const isOnBreak = data?.doctorStatus === "busy" && breakUntilDate && breakUntilDate > now;
  const breakSecondsLeft = isOnBreak
    ? Math.max(0, Math.ceil((breakUntilDate!.getTime() - now.getTime()) / 1000))
    : 0;
  const breakMins = Math.floor(breakSecondsLeft / 60);
  const breakSecs = breakSecondsLeft % 60;

  const fontScale = data?.fontSize ? data.fontSize / 100 : 1;
  const layoutScale = data?.layoutSize ? data.layoutSize / 100 : 1;

  // ── Loading / error states ──
  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400 p-8">
          <WifiOff className="h-16 w-16 mx-auto mb-4 text-slate-600" />
          <p className="text-xl font-semibold">{error}</p>
          <p className="text-sm mt-2 text-slate-500">Device ID: {deviceId}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <Activity className="h-16 w-16 mx-auto mb-4 animate-pulse text-teal-400" />
          <p className="text-xl">Loading display…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 ${t.bg} ${t.body} flex flex-col overflow-hidden`}
      style={{ fontSize: `${fontScale}rem` }}
    >
      {/* ── Header ── */}
      <header
        className={`shrink-0 ${t.header} border-b px-6 py-3 flex items-center justify-between`}
        style={{ minHeight: `${4 * layoutScale}rem` }}
      >
        <div className="flex items-center gap-3">
          {data.logoUrl ? (
            <img src={`/api/storage/${data.logoUrl}`} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <Activity className={`h-7 w-7 ${t.accent}`} />
          )}
          <div>
            <div className="font-bold text-lg leading-none">QRX</div>
            {data.showDoctorName && data.doctorName && (
              <div className={`text-sm ${t.muted} mt-0.5`}>{data.doctorName}</div>
            )}
          </div>
        </div>

        {data.chamberAddress && (
          <div className={`hidden sm:block text-sm font-medium ${t.muted} truncate max-w-xs`}>
            {data.chamberAddress}
          </div>
        )}

        <div className="text-right shrink-0">
          <div className={`text-2xl sm:text-3xl font-mono font-bold ${t.accent}`}>
            {formatTime(now)}
          </div>
          <div className={`text-xs ${t.muted} mt-0.5 hidden sm:block`}>{formatDate(now)}</div>
        </div>
      </header>

      {/* ── Body ── */}
      <div
        className="flex-1 flex flex-col lg:flex-row overflow-hidden"
        style={{ transform: `scale(${layoutScale})`, transformOrigin: "top left", width: `${100 / layoutScale}%`, height: `${100 / layoutScale}%` }}
      >
        {/* Now Serving panel */}
        <div
          className={`flex-1 lg:flex-[2] flex flex-col items-center justify-center p-8 ${isOnBreak ? t.cardBreak : t.card}`}
        >
          {isOnBreak ? (
            <div className="text-center">
              <div className="text-5xl mb-4">☕</div>
              <p className="text-amber-400 uppercase tracking-widest text-sm mb-3">Doctor on Break</p>
              <div className="text-5xl sm:text-7xl font-black text-amber-400 mb-4">
                {breakMins > 0
                  ? `${breakMins}m ${String(breakSecs).padStart(2, "0")}s`
                  : `${breakSecs}s`}
              </div>
              {data.showDoctorName && data.doctorName && (
                <div className={`mt-6 px-5 py-2 ${t.badge} rounded-full text-sm`}>
                  {data.doctorName}
                </div>
              )}
            </div>
          ) : (
            <>
              <p className={`${t.muted} uppercase tracking-widest text-sm mb-2`}>Now Serving</p>
              {data.currentSerial != null ? (
                <div className="text-center">
                  <div
                    className={`font-black leading-none ${t.serialColor} drop-shadow-lg`}
                    style={{ fontSize: `clamp(6rem, 20vw, 16rem)` }}
                  >
                    {data.currentSerial}
                  </div>
                  {data.showPatientName && data.currentPatientName && (
                    <p
                      className="font-bold mt-4"
                      style={{ fontSize: `clamp(1.25rem, 3vw, 2.5rem)` }}
                    >
                      {data.currentPatientName}
                    </p>
                  )}
                  {data.showDoctorName && data.doctorName && (
                    <div className={`mt-6 px-5 py-2 ${t.badge} rounded-full text-sm inline-block`}>
                      {data.doctorName}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`text-center ${t.subMuted}`}>
                  <div
                    className="font-black opacity-30"
                    style={{ fontSize: `clamp(6rem, 20vw, 14rem)` }}
                  >
                    —
                  </div>
                  <p className="text-xl mt-2">No patient currently</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Waiting sidebar */}
        <div className={`shrink-0 lg:w-80 xl:w-96 ${t.sidebar} border-t lg:border-t-0 lg:border-l flex flex-col`}>
          <div className={`p-5 border-b ${t.divider}`}>
            <h2 className={`text-base font-semibold ${t.muted} uppercase tracking-wider`}>
              Waiting Queue
            </h2>
            <p className={`${t.subMuted} text-sm mt-1`}>
              {data.totalWaiting} waiting · {data.totalCompleted} seen today
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {data.nextPatients.length === 0 ? (
              <div className={`text-center ${t.subMuted} py-8 text-sm`}>No patients waiting</div>
            ) : (
              data.nextPatients.map((entry, idx) => (
                <div
                  key={entry.serialNo}
                  className={`flex items-center gap-3 p-3 rounded-xl ${idx === 0 ? t.nextFirst : t.nextRest}`}
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                      idx === 0 ? t.nextFirstNum : t.nextRestNum
                    }`}
                  >
                    {entry.serialNo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {data.showPatientName ? entry.patientName : `Serial ${entry.serialNo}`}
                    </p>
                  </div>
                  {idx === 0 && (
                    <span className={`ml-auto text-xs ${t.accent} font-medium shrink-0`}>Next</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className={`p-3 border-t ${t.divider} flex items-center justify-between`}>
            <div className={`flex items-center gap-1.5 text-xs ${connected ? t.accent : "text-red-400"}`}>
              {connected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span>{connected ? "Live" : "Reconnecting…"}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs ${t.subMuted}`}>
              {data.voiceEnabled ? (
                <Volume2 className="h-3 w-3" />
              ) : (
                <VolumeX className="h-3 w-3" />
              )}
              <span>{data.deviceName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
