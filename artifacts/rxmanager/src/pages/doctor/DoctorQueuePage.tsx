import { useEffect, useState } from "react";
import { useListQueue, useCallNextPatient, useMarkPatientSeen, useSkipPatient, useRecallPatient, useGetDoctorProfile, useUpdateDoctorStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Activity, ChevronRight, SkipForward, CheckCircle, RotateCcw, Tv, Play, Square, Coffee, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DoctorQueuePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const { data: profileData } = useGetDoctorProfile();
  const { data, isLoading, refetch } = useListQueue({ doctorId: profileData?.id ?? 0, date: today });
  const callNext = useCallNextPatient();
  const markSeen = useMarkPatientSeen();
  const skip = useSkipPatient();
  const recall = useRecallPatient();
  const updateStatus = useUpdateDoctorStatus();

  const refreshProfile = () => queryClient.invalidateQueries({ queryKey: ["doctor", "profile"] });

  const handleStatus = async (status: "online" | "offline", breakUntil?: string) => {
    try {
      await updateStatus.mutateAsync({ data: breakUntil ? { status: "busy", breakUntil } : { status } });
      await refreshProfile();
      toast({ title: breakUntil ? "Break started" : status === "online" ? "You are now live" : "Day ended" });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleBreak = (minutes: number) =>
    handleStatus("offline", new Date(Date.now() + minutes * 60 * 1000).toISOString());

  useEffect(() => {
    const interval = setInterval(() => refetch(), 15000);
    return () => clearInterval(interval);
  }, [refetch]);

  const waiting = data?.waiting || [];
  const serving = data?.serving?.[0];
  const seen = data?.seen || [];
  const skipped = data?.skipped || [];
  const done = [...seen, ...skipped];

  const doctorId = profileData?.id ?? 0;

  const handleCallNext = async () => {
    try {
      await callNext.mutateAsync({ id: doctorId });
      toast({ title: "Next patient called" });
      refetch();
    } catch {
      toast({ title: "No waiting patients", variant: "destructive" });
    }
  };

  const handleMarkSeen = async (id: number) => {
    try {
      await markSeen.mutateAsync({ id });
      toast({ title: "Marked as seen" });
      refetch();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleSkip = async (id: number) => {
    try {
      await skip.mutateAsync({ id });
      toast({ title: "Patient skipped" });
      refetch();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleRecall = async (id: number) => {
    try {
      await recall.mutateAsync({ id });
      toast({ title: "Patient recalled" });
      refetch();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Queue</h1>
            <p className="text-muted-foreground mt-1">Manage today's patient queue — {today}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline" size="sm"
              className="text-green-700 border-green-300 hover:bg-green-50 dark:bg-transparent"
              disabled={profileData?.onlineStatus === "online" || updateStatus.isPending}
              onClick={() => handleStatus("online")}
            >
              <Play className="mr-1.5 h-4 w-4" /> Start Live
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-amber-700 border-amber-300 hover:bg-amber-50 dark:bg-transparent">
                  <Coffee className="mr-1.5 h-4 w-4" /> Take Break
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">Break Duration</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[5, 10, 20, 30, 60].map(m => (
                  <DropdownMenuItem key={m} className="text-sm gap-2" onClick={() => handleBreak(m)}>
                    <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                    {m < 60 ? `${m} minutes` : "1 hour"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline" size="sm"
              className="text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-transparent"
              disabled={profileData?.onlineStatus === "offline" || updateStatus.isPending}
              onClick={() => handleStatus("offline")}
            >
              <Square className="mr-1.5 h-4 w-4" /> End Day
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/queue-display?doctorId=${doctorId}`} target="_blank" rel="noreferrer">
                <Tv className="mr-2 h-4 w-4" />TV Display
              </a>
            </Button>
          </div>
        </div>

        {/* Currently Serving */}
        <Card className={serving ? "border-green-300 bg-green-50/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Now Serving
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
                    <CheckCircle className="mr-2 h-4 w-4" />Done
                  </Button>
                  <Button onClick={() => handleSkip(serving.id)} variant="outline">
                    <SkipForward className="mr-2 h-4 w-4" />Skip
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">No patient is being served right now</p>
                <Button onClick={handleCallNext} disabled={waiting.length === 0 || callNext.isPending} className="bg-blue-600 hover:bg-blue-700">
                  <ChevronRight className="mr-2 h-4 w-4" />Call Next ({waiting.length} waiting)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {serving && (
          <div className="flex justify-end">
            <Button onClick={handleCallNext} disabled={waiting.length === 0 || callNext.isPending} variant="outline">
              <ChevronRight className="mr-2 h-4 w-4" />Call Next Patient ({waiting.length} waiting)
            </Button>
          </div>
        )}

        {/* Waiting Queue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Waiting Queue ({waiting.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Loading...</p>
            ) : waiting.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No patients waiting</p>
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
                      <span className="text-xs text-muted-foreground">Position {idx + 1}</span>
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
              <CardTitle className="text-base text-muted-foreground">Completed Today ({done.length})</CardTitle>
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
