import { useEffect } from "react";
import { useListQueue, useCallNextPatient, useMarkPatientSeen, useSkipPatient, useRecallPatient } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, ChevronRight, SkipForward, CheckCircle, RotateCcw, Tv } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AssistantQueuePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const today = new Date().toISOString().split("T")[0];
  const doctorId = user?.doctorId ?? 0;
  const { data, isLoading, refetch } = useListQueue({ doctorId, date: today });
  const callNext = useCallNextPatient();
  const markSeen = useMarkPatientSeen();
  const skip = useSkipPatient();
  const recall = useRecallPatient();

  useEffect(() => {
    const interval = setInterval(() => refetch(), 15000);
    return () => clearInterval(interval);
  }, [refetch]);

  const waiting = data?.waiting || [];
  const serving = data?.serving?.[0];
  const seen = data?.seen || [];
  const skipped = data?.skipped || [];
  const done = [...seen, ...skipped];

  const handleCallNext = async () => {
    try {
      await callNext.mutateAsync({ id: doctorId });
      toast({ title: t("nextPatientCalled") });
      refetch();
    } catch {
      toast({ title: t("noWaitingPatients"), variant: "destructive" });
    }
  };

  const handleMarkSeen = async (id: number) => {
    try {
      await markSeen.mutateAsync({ id });
      toast({ title: t("markedSeen") });
      refetch();
    } catch {
      toast({ title: t("errorGeneric"), variant: "destructive" });
    }
  };

  const handleSkip = async (id: number) => {
    try {
      await skip.mutateAsync({ id });
      toast({ title: t("patientSkipped") });
      refetch();
    } catch {
      toast({ title: t("errorGeneric"), variant: "destructive" });
    }
  };

  const handleRecall = async (id: number) => {
    try {
      await recall.mutateAsync({ id });
      toast({ title: t("patientRecalled") });
      refetch();
    } catch {
      toast({ title: t("errorGeneric"), variant: "destructive" });
    }
  };

  return (
    <DashboardLayout role="assistant">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("liveQueue")}</h1>
            <p className="text-muted-foreground mt-1">{today}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`/queue-display?doctorId=${doctorId}`} target="_blank" rel="noreferrer">
              <Tv className="mr-2 h-4 w-4" />{t("tvDisplay")}
            </a>
          </Button>
        </div>

        {/* Currently Serving */}
        <Card className={serving ? "border-green-300 bg-green-50/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              {t("serving")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serving ? (
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-green-700">#{serving.serialNo}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{serving.patientName}</p>
                    <p className="text-muted-foreground">{serving.patientPhone}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleMarkSeen(serving.id)} variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" />{t("markSeen")}
                  </Button>
                  <Button onClick={() => handleSkip(serving.id)} variant="outline">
                    <SkipForward className="mr-2 h-4 w-4" />{t("skip")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">{t("noPatientServing")}</p>
                <Button onClick={handleCallNext} disabled={waiting.length === 0 || callNext.isPending} className="bg-blue-600 hover:bg-blue-700">
                  <ChevronRight className="mr-2 h-4 w-4" />{t("next")} ({waiting.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {serving && (
          <div className="flex justify-end">
            <Button onClick={handleCallNext} disabled={waiting.length === 0 || callNext.isPending} variant="outline">
              <ChevronRight className="mr-2 h-4 w-4" />{t("next")} ({waiting.length})
            </Button>
          </div>
        )}

        {/* Waiting Queue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("waiting")} ({waiting.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">{t("loading")}</p>
            ) : waiting.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">{t("noPatientsWaiting")}</p>
            ) : (
              <div className="space-y-2">
                {waiting.map((entry, idx) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                        {entry.serialNo}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{entry.patientName}</p>
                        <p className="text-xs text-muted-foreground">{entry.patientPhone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{idx + 1}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleSkip(entry.id)}>
                        <SkipForward className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Done/Skipped */}
        {done.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">{t("completedToday")} ({done.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {done.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {entry.serialNo}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{entry.patientName}</p>
                        <p className="text-xs text-muted-foreground">{entry.patientPhone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.status === "seen" ? "outline" : "secondary"}>{entry.status}</Badge>
                      {entry.status === "skipped" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRecall(entry.id)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
