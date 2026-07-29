import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListEmailLogs, useListSmsLogs, useGetEmailSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Settings, CheckCircle2, XCircle, Clock } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Sent</Badge>;
  if (status === "failed") return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

export default function AdminEmailLogsPage() {
  const { data: emailLogs } = useListEmailLogs({});
  const { data: smsLogs } = useListSmsLogs({});
  const { data: emailSettings } = useGetEmailSettings();

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Notification Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">Track email and SMS notification history for appointment confirmations</p>
        </div>

        {/* SMTP Settings Card */}
        <Card className={emailSettings?.configured ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/30"}>
          <CardContent className="p-4 flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium text-sm">Email Configuration</p>
              {emailSettings?.configured ? (
                <p className="text-xs text-green-700">SMTP configured — from: {emailSettings.fromEmail}</p>
              ) : (
                <p className="text-xs text-amber-700">SMTP not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER environment variables to enable email sending</p>
              )}
            </div>
            <Badge variant={emailSettings?.enabled ? "default" : "secondary"} className="ml-auto shrink-0">
              {emailSettings?.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardContent>
        </Card>

        <Tabs defaultValue="email">
          <TabsList>
            <TabsTrigger value="email"><Mail className="h-4 w-4 mr-1.5" />Email Logs ({emailLogs?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="sms"><MessageSquare className="h-4 w-4 mr-1.5" />SMS Logs ({smsLogs?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            {!emailLogs?.length ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No email logs yet. Email logs are created when appointments are booked with an email address.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {emailLogs.map(log => (
                  <Card key={log.id}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm truncate">{log.recipientEmail}</span>
                          <StatusBadge status={log.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{log.subject}</p>
                        {log.errorMessage && <p className="text-xs text-destructive mt-1">{log.errorMessage}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sms" className="mt-4">
            <Card className="mb-4 border-blue-200 bg-blue-50/30">
              <CardContent className="p-3 text-xs text-blue-700">
                SMS sending is architecture-ready but requires a provider API key. Set SMS_PROVIDER, SMS_API_KEY environment variables to enable.
              </CardContent>
            </Card>
            {!smsLogs?.length ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No SMS logs yet. SMS logs are created when appointments are booked.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {smsLogs.map(log => (
                  <Card key={log.id}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm">{log.phone}</span>
                          <StatusBadge status={log.status} />
                          {log.provider && <Badge variant="outline" className="text-xs">{log.provider}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{log.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
