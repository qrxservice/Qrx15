import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDriverProfile, useUpdateDriverProfile } from "@/lib/ambulance-api";
import { DriverLayout } from "@/components/layout/DriverLayout";
import {
  FileText, Camera, Car, CheckCircle, AlertCircle, Clock,
  Upload, ExternalLink, RefreshCw,
} from "lucide-react";

type DocStatus = "provided" | "missing" | "expiring_soon" | "expired";

function docStatus(value: string | null | undefined, expiry?: string | null): DocStatus {
  if (!value) return "missing";
  if (expiry) {
    const exp = new Date(expiry);
    const now = new Date();
    const daysLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft < 0) return "expired";
    if (daysLeft < 30) return "expiring_soon";
  }
  return "provided";
}

function StatusBadge({ status }: { status: DocStatus }) {
  const config = {
    provided: { label: "Verified", className: "bg-green-100 text-green-700", icon: CheckCircle },
    missing: { label: "Missing", className: "bg-red-100 text-red-700", icon: AlertCircle },
    expiring_soon: { label: "Expiring Soon", className: "bg-orange-100 text-orange-700", icon: Clock },
    expired: { label: "Expired", className: "bg-red-100 text-red-700", icon: AlertCircle },
  }[status];
  const Icon = config.icon;
  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

interface DocCardProps {
  title: string;
  icon: React.ElementType;
  status: DocStatus;
  photoUrl?: string | null;
  expiry?: string | null;
  field: string;
  photoField: string;
  expiryField?: string;
  onUpdate: (data: Record<string, string>) => void;
  isPending: boolean;
}

function DocCard({ title, icon: Icon, status, photoUrl, expiry, field, photoField, expiryField, onUpdate, isPending }: DocCardProps) {
  const [editing, setEditing] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newExpiry, setNewExpiry] = useState("");

  const handleSave = () => {
    if (!newUrl && !newExpiry) return;
    const data: Record<string, string> = {};
    if (newUrl) data[photoField] = newUrl;
    if (newExpiry && expiryField) data[expiryField] = newExpiry;
    onUpdate(data);
    setEditing(false);
    setNewUrl("");
    setNewExpiry("");
  };

  return (
    <Card className={status === "missing" || status === "expired" ? "border-red-200" : status === "expiring_soon" ? "border-orange-200" : ""}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${status === "provided" ? "bg-green-50" : "bg-gray-100"}`}>
              <Icon className={`h-4 w-4 ${status === "provided" ? "text-green-600" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="font-medium text-sm">{title}</p>
              {expiry && (
                <p className="text-xs text-muted-foreground">Expires: {new Date(expiry).toLocaleDateString()}</p>
              )}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {photoUrl && (
          <div className="flex items-center gap-2">
            <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden">
              <img src={photoUrl} alt={title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
              <ExternalLink className="h-3 w-3" /> View full
            </a>
          </div>
        )}

        {editing ? (
          <div className="space-y-2 border-t pt-2">
            <div className="space-y-1">
              <Label className="text-xs">New Photo URL</Label>
              <Input placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)} className="h-8 text-sm" />
            </div>
            {expiryField && (
              <div className="space-y-1">
                <Label className="text-xs">Expiry Date</Label>
                <Input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} className="h-8 text-sm" />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isPending} className="h-7 text-xs">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7 text-xs">Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 text-xs gap-1">
            <RefreshCw className="h-3 w-3" />
            {status === "missing" ? "Upload" : "Re-upload"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function DriverDocumentsPage() {
  const { toast } = useToast();
  const { data: driver, isLoading } = useDriverProfile();
  const update = useUpdateDriverProfile();

  const handleUpdate = (data: Record<string, string>) => {
    update.mutate(data as any, {
      onSuccess: () => toast({ title: "Document updated" }),
      onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) return (
    <DriverLayout>
      <div className="flex items-center justify-center py-16">
        <FileText className="h-8 w-8 animate-pulse text-gray-400" />
      </div>
    </DriverLayout>
  );

  if (!driver) return null;

  const nidStatus = docStatus(driver.nidPhoto);
  const nidBackStatus = docStatus(driver.nidBackPhoto);
  const selfieStatus = docStatus(driver.selfiePhoto);
  const licenceStatus = docStatus(driver.licencePhoto, driver.licenceExpiry);

  const allDocs = [nidStatus, nidBackStatus, selfieStatus, licenceStatus];
  const missingCount = allDocs.filter(s => s === "missing").length;
  const expiredCount = allDocs.filter(s => s === "expired" || s === "expiring_soon").length;

  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl">Documents Centre</h1>
          <Badge className={
            driver.approvalStatus === "approved" ? "bg-green-100 text-green-700" :
            driver.approvalStatus === "pending" ? "bg-yellow-100 text-yellow-700" :
            driver.approvalStatus === "suspended" ? "bg-red-100 text-red-700" :
            "bg-gray-100 text-gray-600"
          }>
            Account: {driver.approvalStatus}
          </Badge>
        </div>

        {(missingCount > 0 || expiredCount > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              {missingCount > 0 && <p>{missingCount} document{missingCount > 1 ? "s" : ""} missing</p>}
              {expiredCount > 0 && <p>{expiredCount} document{expiredCount > 1 ? "s" : ""} expired or expiring soon</p>}
              <p className="text-xs mt-0.5">Upload or re-upload to keep your account active.</p>
            </div>
          </div>
        )}

        {/* NID section */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" /> Identity Documents
          </h2>
          <DocCard
            title="NID Front Photo"
            icon={FileText}
            status={nidStatus}
            photoUrl={driver.nidPhoto}
            field="nidPhoto" photoField="nidPhoto"
            onUpdate={handleUpdate} isPending={update.isPending}
          />
          <DocCard
            title="NID Back Photo"
            icon={FileText}
            status={nidBackStatus}
            photoUrl={driver.nidBackPhoto}
            field="nidBackPhoto" photoField="nidBackPhoto"
            onUpdate={handleUpdate} isPending={update.isPending}
          />
          <DocCard
            title="Selfie Verification"
            icon={Camera}
            status={selfieStatus}
            photoUrl={driver.selfiePhoto}
            field="selfiePhoto" photoField="selfiePhoto"
            onUpdate={handleUpdate} isPending={update.isPending}
          />
        </div>

        {/* Licence */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
            <Car className="h-3.5 w-3.5" /> Driving Licence
          </h2>
          <DocCard
            title="Driving Licence"
            icon={FileText}
            status={licenceStatus}
            photoUrl={driver.licencePhoto}
            expiry={driver.licenceExpiry}
            field="licencePhoto" photoField="licencePhoto" expiryField="licenceExpiry"
            onUpdate={handleUpdate} isPending={update.isPending}
          />
          {driver.licenceNumber && (
            <p className="text-xs text-muted-foreground px-1">Licence No: {driver.licenceNumber}</p>
          )}
        </div>

        {/* Vehicle docs */}
        {driver.vehicles && driver.vehicles.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
              <Car className="h-3.5 w-3.5" /> Vehicle Documents
            </h2>
            {driver.vehicles.map(v => (
              <Card key={v.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{v.registrationNumber}</p>
                      <p className="text-xs text-muted-foreground">{v.make ? `${v.make} ${v.model ?? ""}` : v.vehicleType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.vehiclePhoto ? (
                        <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Photo OK</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700"><AlertCircle className="h-3 w-3 mr-1" />No Photo</Badge>
                      )}
                      <Badge className={v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                        {v.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pb-2">
          Admin reviews documents before account approval. Contact support if verification is delayed.
        </p>
      </div>
    </DriverLayout>
  );
}
