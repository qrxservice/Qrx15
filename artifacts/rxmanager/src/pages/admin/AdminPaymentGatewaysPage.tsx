import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListPaymentGateways, useUpdatePaymentGateway, getListPaymentGatewaysQueryKey,
  type PaymentGateway, type PaymentGatewayInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Wallet, QrCode, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";
import { storageUrl } from "@/lib/storage";

const STANDARD_GATEWAYS: {
  key: PaymentGateway["gateway"];
  label: string;
  description: string;
  apiKeyLabel?: string;
  secretKeyLabel?: string;
  merchantIdLabel?: string;
  hideMerchantId?: boolean;
}[] = [
  { key: "sslcommerz", label: "SSLCommerz", description: "Card, mobile banking & internet banking aggregator" },
  {
    key: "aamarpay",
    label: "AamarPay",
    description: "Bangladeshi payment gateway — cards, mobile banking & internet banking",
    apiKeyLabel: "Store ID",
    secretKeyLabel: "Signature Key",
    hideMerchantId: true,
  },
  {
    key: "shurjopay",
    label: "ShurjoPay",
    description: "Bangladeshi payment gateway — cards, mobile banking & wallet payments",
    apiKeyLabel: "Username",
    secretKeyLabel: "Password",
    hideMerchantId: true,
  },
  { key: "bkash", label: "bKash", description: "Mobile financial service" },
  { key: "nagad", label: "Nagad", description: "Mobile financial service" },
  { key: "rocket", label: "Rocket (DBBL)", description: "Mobile financial service" },
];

type Draft = {
  apiKey: string;
  secretKey: string;
  merchantId: string;
  mode: "sandbox" | "live";
  successUrl: string;
  failedUrl: string;
  callbackUrl: string;
};

const emptyDraft: Draft = { apiKey: "", secretKey: "", merchantId: "", mode: "sandbox", successUrl: "", failedUrl: "", callbackUrl: "" };

/** Generic gateway card for all standard gateways */
function GatewayCard({ gateway, label, description, data, onSaved, apiKeyLabel, secretKeyLabel, hideMerchantId }: {
  gateway: PaymentGateway["gateway"];
  label: string;
  description: string;
  data: PaymentGateway | undefined;
  onSaved: () => void;
  apiKeyLabel?: string;
  secretKeyLabel?: string;
  hideMerchantId?: boolean;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [initialized, setInitialized] = useState(false);
  const updateMut = useUpdatePaymentGateway();

  useEffect(() => {
    if (data && !initialized) {
      setDraft({
        apiKey: data.apiKey ?? "",
        secretKey: "",
        merchantId: data.merchantId ?? "",
        mode: data.mode,
        successUrl: data.successUrl ?? "",
        failedUrl: data.failedUrl ?? "",
        callbackUrl: data.callbackUrl ?? "",
      });
      setInitialized(true);
    }
  }, [data, initialized]);

  const handleSave = async () => {
    const body: PaymentGatewayInput = {
      apiKey: draft.apiKey,
      merchantId: draft.merchantId,
      mode: draft.mode,
      successUrl: draft.successUrl,
      failedUrl: draft.failedUrl,
      callbackUrl: draft.callbackUrl,
      ...(draft.secretKey ? { secretKey: draft.secretKey } : {}),
    };
    try {
      await updateMut.mutateAsync({ gateway, data: body });
      setDraft(d => ({ ...d, secretKey: "" }));
      toast({ title: `${label} settings saved` });
      onSaved();
    } catch {
      toast({ title: `Failed to save ${label} settings`, variant: "destructive" });
    }
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      await updateMut.mutateAsync({ gateway, data: { enabled } });
      toast({ title: `${label} ${enabled ? "enabled" : "disabled"}` });
      onSaved();
    } catch {
      toast({ title: `Failed to toggle ${label}`, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" />{label}</span>
            <span className="text-xs font-normal text-muted-foreground">{description}</span>
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={data?.enabled ? "default" : "secondary"}>{data?.enabled ? "Enabled" : "Disabled"}</Badge>
            <Switch checked={data?.enabled ?? false} disabled={updateMut.isPending} onCheckedChange={handleToggle} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{apiKeyLabel ?? "API Key"}</Label>
            <Input value={draft.apiKey} onChange={e => setDraft(d => ({ ...d, apiKey: e.target.value }))} placeholder={apiKeyLabel ?? "API key"} />
          </div>
          <div className="space-y-1.5">
            <Label>{secretKeyLabel ?? "Secret Key"} {data?.secretConfigured && <span className="text-xs text-muted-foreground">(leave blank to keep)</span>}</Label>
            <Input type="password" value={draft.secretKey} onChange={e => setDraft(d => ({ ...d, secretKey: e.target.value }))} placeholder="••••••••" autoComplete="new-password" />
          </div>
          {!hideMerchantId && (
            <div className="space-y-1.5">
              <Label>Merchant ID</Label>
              <Input value={draft.merchantId} onChange={e => setDraft(d => ({ ...d, merchantId: e.target.value }))} placeholder="Merchant ID" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select value={draft.mode} onValueChange={v => setDraft(d => ({ ...d, mode: v as "sandbox" | "live" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Success URL</Label>
            <Input value={draft.successUrl} onChange={e => setDraft(d => ({ ...d, successUrl: e.target.value }))} placeholder="https://yourdomain.com/payment/success" />
          </div>
          <div className="space-y-1.5">
            <Label>Failed URL</Label>
            <Input value={draft.failedUrl} onChange={e => setDraft(d => ({ ...d, failedUrl: e.target.value }))} placeholder="https://yourdomain.com/payment/failed" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Callback URL</Label>
            <Input value={draft.callbackUrl} onChange={e => setDraft(d => ({ ...d, callbackUrl: e.target.value }))} placeholder="https://yourdomain.com/api/payment/callback" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateMut.isPending}>Save {label} Settings</Button>
      </CardContent>
    </Card>
  );
}

// Shape returned by the admin payment gateways API (includes QR fields)
type GatewayRow = PaymentGateway & {
  qrImageUrl?: string | null;
  merchantName?: string | null;
  paymentInstructions?: string | null;
  successMessage?: string | null;
  failureMessage?: string | null;
};

type QrDraft = {
  merchantName: string;
  paymentInstructions: string;
  successMessage: string;
  failureMessage: string;
  qrImageUrl: string;
};

const emptyQrDraft: QrDraft = {
  merchantName: "",
  paymentInstructions: "স্ক্যান করুন এবং পেমেন্ট করুন। পেমেন্টের পর Transaction ID লিখুন।",
  successMessage: "আপনার পেমেন্ট যাচাই চলছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।",
  failureMessage: "পেমেন্ট নিশ্চিত করা যায়নি। দয়া করে আবার চেষ্টা করুন বা আমাদের সাথে যোগাযোগ করুন।",
  qrImageUrl: "",
};

/** Dedicated Bangla QR gateway card with image upload + text config */
function BanglaQrCard({ data, onSaved }: { data: GatewayRow | undefined; onSaved: () => void }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<QrDraft>(emptyQrDraft);
  const [initialized, setInitialized] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useUpload({ getAuthToken: () => localStorage.getItem("auth_token") });
  const updateMut = useUpdatePaymentGateway();

  useEffect(() => {
    if (data && !initialized) {
      setDraft({
        merchantName: (data as GatewayRow).merchantName ?? "",
        paymentInstructions: (data as GatewayRow).paymentInstructions ?? emptyQrDraft.paymentInstructions,
        successMessage: (data as GatewayRow).successMessage ?? emptyQrDraft.successMessage,
        failureMessage: (data as GatewayRow).failureMessage ?? emptyQrDraft.failureMessage,
        qrImageUrl: (data as GatewayRow).qrImageUrl ?? "",
      });
      setInitialized(true);
    }
  }, [data, initialized]);

  const handleToggle = async (enabled: boolean) => {
    if (enabled && !draft.qrImageUrl) {
      toast({ title: "Upload a QR code image first before enabling this payment method", variant: "destructive" });
      return;
    }
    try {
      await updateMut.mutateAsync({ gateway: "bangla_qr", data: { enabled } });
      toast({ title: `Bangla QR ${enabled ? "enabled" : "disabled"}` });
      onSaved();
    } catch {
      toast({ title: "Failed to toggle Bangla QR", variant: "destructive" });
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Only JPG, PNG or WebP images allowed", variant: "destructive" }); return;
    }
    setUploading(true);
    try {
      const res = await uploadFile(file);
      if (!res) throw new Error("Upload failed");
      // Immediately persist the new QR image path
      await updateMut.mutateAsync({ gateway: "bangla_qr", data: { qrImageUrl: res.objectPath } as any });
      setDraft(d => ({ ...d, qrImageUrl: res.objectPath }));
      toast({ title: "QR image uploaded" });
      onSaved();
    } catch {
      toast({ title: "Failed to upload QR image", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveQr = async () => {
    try {
      await updateMut.mutateAsync({ gateway: "bangla_qr", data: { qrImageUrl: "" } as any });
      setDraft(d => ({ ...d, qrImageUrl: "" }));
      toast({ title: "QR image removed" });
      onSaved();
    } catch {
      toast({ title: "Failed to remove QR image", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({
        gateway: "bangla_qr",
        data: {
          merchantName: draft.merchantName,
          paymentInstructions: draft.paymentInstructions,
          successMessage: draft.successMessage,
          failureMessage: draft.failureMessage,
        } as any,
      });
      toast({ title: "Bangla QR settings saved" });
      onSaved();
    } catch {
      toast({ title: "Failed to save Bangla QR settings", variant: "destructive" });
    }
  };

  const previewUrl = storageUrl(draft.qrImageUrl);

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              Bangla QR Code Payment
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Bangladesh interoperable QR payment — customers scan your QR with any Bangla QR-supported banking app
            </span>
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={data?.enabled ? "default" : "secondary"}>{data?.enabled ? "Enabled" : "Disabled"}</Badge>
            <Switch checked={data?.enabled ?? false} disabled={updateMut.isPending} onCheckedChange={handleToggle} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* QR Code Image Upload */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Bangla QR Code Image</Label>
          <p className="text-xs text-muted-foreground">
            Upload your bank-generated Bangla QR image. This is displayed at full size on the checkout screen for customers to scan.
            Recommended: 512×512 px or larger, PNG or JPG.
          </p>
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="shrink-0">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Bangla QR Code preview"
                    className="h-40 w-40 object-contain border-2 border-border rounded-xl bg-white p-2"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveQr}
                    disabled={updateMut.isPending}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-40 w-40 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/30">
                  <ImageIcon className="h-10 w-10 opacity-30" />
                  <span className="text-xs">No QR uploaded</span>
                </div>
              )}
            </div>
            {/* Upload control */}
            <div className="flex-1 space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleQrUpload}
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || updateMut.isPending}
                className="gap-2"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : previewUrl ? "Replace QR Image" : "Upload QR Image"}
              </Button>
              {previewUrl && (
                <p className="text-xs text-green-600 font-medium">✓ QR image is set and ready</p>
              )}
              {!previewUrl && (
                <p className="text-xs text-amber-600">⚠ Upload a QR image before enabling this payment method</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-semibold">Display Settings</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Merchant Name</Label>
              <Input
                value={draft.merchantName}
                onChange={e => setDraft(d => ({ ...d, merchantName: e.target.value }))}
                placeholder="e.g. QRX Healthcare Ltd."
              />
              <p className="text-xs text-muted-foreground">Displayed under the QR code at checkout</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Payment Instructions</Label>
              <Textarea
                value={draft.paymentInstructions}
                onChange={e => setDraft(d => ({ ...d, paymentInstructions: e.target.value }))}
                placeholder="Short guide shown to customers at checkout"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Success Message</Label>
              <Textarea
                value={draft.successMessage}
                onChange={e => setDraft(d => ({ ...d, successMessage: e.target.value }))}
                placeholder="Message shown after customer submits transaction ID"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Failure Message</Label>
              <Textarea
                value={draft.failureMessage}
                onChange={e => setDraft(d => ({ ...d, failureMessage: e.target.value }))}
                placeholder="Message shown on failure or timeout"
                rows={3}
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={updateMut.isPending} className="gap-2">
            {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Bangla QR Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPaymentGatewaysPage() {
  const queryClient = useQueryClient();
  const { data: gateways } = useListPaymentGateways();

  const refetchGateways = () => queryClient.invalidateQueries({ queryKey: getListPaymentGatewaysQueryKey() });
  const banglaQrData = gateways?.find(row => row.gateway === "bangla_qr") as GatewayRow | undefined;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="h-6 w-6" />Payment Gateways</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure your payment gateway credentials. Enable one or more gateways below — doctors and
            patients will only see payment options for gateways that are switched on. Bangla QR lets
            customers scan a QR code and confirm payment with a transaction ID.
          </p>
        </div>

        {/* Bangla QR — dedicated card at top */}
        <BanglaQrCard data={banglaQrData} onSaved={refetchGateways} />

        {/* Standard gateways */}
        {STANDARD_GATEWAYS.map(g => (
          <GatewayCard
            key={g.key}
            gateway={g.key}
            label={g.label}
            description={g.description}
            data={gateways?.find(row => row.gateway === g.key)}
            onSaved={refetchGateways}
            apiKeyLabel={g.apiKeyLabel}
            secretKeyLabel={g.secretKeyLabel}
            hideMerchantId={g.hideMerchantId}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}
