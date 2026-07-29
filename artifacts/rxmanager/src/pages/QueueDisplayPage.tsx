import { useEffect, useState, useCallback } from "react";
import { useGetQueueDisplay } from "@workspace/api-client-react";
import { Activity, Wifi, Coffee, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";

export default function QueueDisplayPage() {
  const { t } = useLanguage();
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("doctorId");
    if (id) setDoctorId(Number(id));
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { data, refetch } = useGetQueueDisplay(
    { doctorId: doctorId ?? 0 },
    { query: { queryKey: ["queueDisplay", doctorId], enabled: !!doctorId, refetchInterval: 30000 } }
  );

  const handleUpdate = useCallback(() => { void refetch(); }, [refetch]);
  useQueueWebSocket(doctorId, handleUpdate);

  const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (d: Date) => d.toLocaleDateString("en-BD", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const fmt12 = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const breakUntilDate = data?.breakUntil ? new Date(data.breakUntil) : null;
  const isOnBreak = data?.doctorStatus === "busy" && breakUntilDate && breakUntilDate > now;
  const breakSecondsLeft = isOnBreak ? Math.max(0, Math.ceil((breakUntilDate!.getTime() - now.getTime()) / 1000)) : 0;
  const breakMins = Math.floor(breakSecondsLeft / 60);
  const breakSecs = breakSecondsLeft % 60;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-teal-400" />
          <div>
            <h1 className="text-xl font-bold">QRX</h1>
            <p className="text-slate-400 text-sm">{t("patientQueueDisplay")}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-teal-400">{formatTime(now)}</div>
          <div className="text-slate-400 text-sm mt-1">{formatDate(now)}</div>
        </div>
      </header>

      {!data ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <Activity className="h-16 w-16 mx-auto mb-4 animate-pulse" />
            <p className="text-xl">{t("connectingToQueue")}</p>
            <p className="text-sm mt-2">{t("queueDisplayHint")}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Now Serving / Break */}
          <div className={`lg:col-span-2 flex flex-col items-center justify-center p-8 ${isOnBreak ? "bg-gradient-to-br from-amber-900/40 to-slate-900" : "bg-gradient-to-br from-teal-900/40 to-slate-900"}`}>
            {isOnBreak ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <Coffee className="h-16 w-16 text-amber-400" />
                </div>
                <p className="text-amber-400 uppercase tracking-widest text-sm mb-3">{t("doctorOnBreak")}</p>
                <div className="text-6xl font-black text-amber-400 mb-4">
                  {breakMins > 0 ? `${breakMins}m ${String(breakSecs).padStart(2, "0")}s` : `${breakSecs}s`}
                </div>
                <div className="flex items-center justify-center gap-2 text-amber-200 text-xl mb-2">
                  <Clock className="h-5 w-5" />
                  <span>{t("estimatedReturn")} {fmt12(breakUntilDate!)}</span>
                </div>
                {data.doctorName && (
                  <div className="mt-8 px-6 py-3 bg-slate-800 rounded-full text-sm text-slate-300">
                    {data.doctorName}
                  </div>
                )}
                <p className="text-slate-500 text-sm mt-6">{t("pleaseWaitReturn")}</p>
              </div>
            ) : (
              <>
                <p className="text-slate-400 uppercase tracking-widest text-sm mb-4">{t("serving")}</p>
                {data.currentSerial != null ? (
                  <>
                    <div className="text-[12rem] font-black leading-none text-teal-400 drop-shadow-lg">
                      {data.currentSerial}
                    </div>
                    <div className="mt-6 text-center">
                      <p className="text-3xl font-bold">{data.currentPatientName}</p>
                    </div>
                    {data.doctorName && (
                      <div className="mt-8 px-6 py-3 bg-slate-800 rounded-full text-sm text-slate-300">
                        {data.doctorName}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-slate-500">
                    <div className="text-8xl font-black text-slate-700">—</div>
                    <p className="text-2xl mt-4">{t("noPatientCurrently")}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Waiting List */}
          <div className="bg-slate-800 border-l border-slate-700 flex flex-col">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-300 uppercase tracking-wider">{t("waitingQueue")}</h2>
              <p className="text-slate-500 text-sm mt-1">{data.nextPatients?.length ?? 0} {t("patientsWaitingSuffix")}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(!data.nextPatients || data.nextPatients.length === 0) ? (
                <div className="text-center text-slate-600 py-8">
                  <p>{t("noPatientsWaiting")}</p>
                </div>
              ) : (
                data.nextPatients.map((entry, idx) => (
                  <div key={entry.serialNo} className={`flex items-center gap-4 p-4 rounded-xl ${idx === 0 ? "bg-teal-900/40 border border-teal-700/50" : "bg-slate-700/50"}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${
                      idx === 0 ? "bg-teal-500 text-slate-900" : "bg-slate-600 text-slate-300"
                    }`}>
                      {entry.serialNo}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{entry.patientName}</p>
                      <p className="text-slate-500 text-sm">{entry.patientPhone}</p>
                    </div>
                    {idx === 0 && (
                      <span className="ml-auto text-xs text-teal-400 font-medium shrink-0">{t("nextUp")}</span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-700 flex items-center justify-center gap-2 text-slate-600 text-xs">
              <Wifi className="h-3.5 w-3.5" />
              <span>{t("liveUpdates")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
