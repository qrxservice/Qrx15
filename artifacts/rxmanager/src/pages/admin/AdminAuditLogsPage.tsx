import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListAuditLogs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

const ENTITY_TYPES = ["banner", "advertisement", "settings", "migration", "prescription", "doctor", "assistant", "appointment"];
const ACTIONS = ["create", "update", "delete", "import", "rollback", "reset_password"];

function actionColor(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action === "delete" || action === "rollback") return "destructive";
  if (action === "create" || action === "import") return "default";
  return "secondary";
}

export default function AdminAuditLogsPage() {
  const [entityType, setEntityType] = useState("all");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);

  const params = {
    page,
    ...(entityType !== "all" ? { entityType } : {}),
    ...(action !== "all" ? { action } : {}),
  };
  const { data: logs } = useListAuditLogs(params);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">Every create, update, delete and import across the platform</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Select value={entityType} onValueChange={v => { setEntityType(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Entity type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {ENTITY_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={v => { setAction(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {!logs?.length ? (
              <div className="py-16 text-center text-muted-foreground">No audit entries.</div>
            ) : (
              <div className="divide-y">
                {logs.map(log => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-4">
                    <div className="flex items-center gap-2 sm:block">
                      <Badge variant={actionColor(log.action)} className="text-xs shrink-0">{log.action}</Badge>
                      <span className="text-xs text-muted-foreground sm:hidden">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{log.actorName ?? "System"}</span>
                        {log.actorRole && <span className="text-muted-foreground"> ({log.actorRole})</span>}
                        {" "}{log.action}d {log.entityType}
                        {log.entityId != null && <span className="text-muted-foreground"> #{log.entityId}</span>}
                      </p>
                      {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Prev
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button variant="outline" size="sm" disabled={!logs || logs.length < 100} onClick={() => setPage(p => p + 1)}>
            Next<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
