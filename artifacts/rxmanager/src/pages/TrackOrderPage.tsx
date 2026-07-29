import { useState } from "react";
import { useLanguage, type Lang } from "@/contexts/LanguageContext";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Phone, Hash, MapPin, User, Clock, Truck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { storageUrl } from "@/lib/storage";

const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  processing: "bg-purple-100 text-purple-700 border-purple-200",
  shipped: "bg-cyan-100 text-cyan-700 border-cyan-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_INDEX: Record<string, number> = {
  pending: 0, confirmed: 0, processing: 1, shipped: 2, delivered: 3,
};

interface OrderItem {
  id: number;
  quantity: number;
  priceAtPurchase: string;
  product?: { name: string; imageUrl?: string | null };
}

interface Order {
  id: number;
  status: string;
  totalAmount: string;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  items: OrderItem[];
}

const STATUS_LABEL_KEY: Record<string, "statusPending" | "statusConfirmed" | "statusProcessing" | "statusShipped" | "statusDelivered" | "statusCancelled"> = {
  pending: "statusPending",
  confirmed: "statusConfirmed",
  processing: "statusProcessing",
  shipped: "statusShipped",
  delivered: "statusDelivered",
  cancelled: "statusCancelled",
};

export default function TrackOrderPage() {
  const { t, lang } = useLanguage();
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const STATUS_STEPS = [
    { key: "pending", label: t("orderStagePlaced"), icon: Package },
    { key: "processing", label: t("orderStageProcessing"), icon: Truck },
    { key: "shipped", label: t("orderStageShipped"), icon: Truck },
    { key: "delivered", label: t("orderStageDelivered"), icon: CheckCircle2 },
  ];

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !orderId.trim()) { setError(t("enterBothFields")); return; }
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch(`${apiBase}/api/shop/orders/track?phone=${encodeURIComponent(phone.trim())}&orderId=${encodeURIComponent(orderId.trim())}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("orderNotFound"));
        return;
      }
      const data = await res.json();
      setOrder(data);
    } catch {
      setError(t("orderTrackFailed"));
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = order ? (STATUS_INDEX[order.status] ?? -1) : -1;
  const isCancelled = order?.status === "cancelled";

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="text-center mb-8">
          <Truck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold mb-2">{t("trackOrderTitle")}</h1>
          <p className="text-muted-foreground">{t("trackOrderSubtitle")}</p>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleTrack} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />{t("phone")}
                </label>
                <Input
                  placeholder={t("phonePlaceholder")}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />{t("orderNumber")}
                </label>
                <Input
                  placeholder={t("orderNumberPlaceholder")}
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  type="number"
                  min="1"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("tracking")}</> : <><Truck className="h-4 w-4 mr-2" />{t("trackOrderBtn")}</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {order && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">{t("orderPrefix")} #{order.id}</CardTitle>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>
                    {STATUS_LABEL_KEY[order.status] ? t(STATUS_LABEL_KEY[order.status]) : order.status}
                  </span>
                </div>
                {order.createdAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    {t("placedOn")} {new Date(order.createdAt).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                {!isCancelled && (
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      {STATUS_STEPS.map((step, i) => {
                        const done = i <= stepIndex;
                        const current = i === stepIndex;
                        return (
                          <div key={step.key} className="flex flex-col items-center flex-1 relative">
                            {i < STATUS_STEPS.length - 1 && (
                              <div className={`absolute top-4 left-1/2 right-0 h-0.5 -translate-y-1/2 ${done && i < stepIndex ? "bg-primary" : "bg-muted"}`} style={{ width: "100%" }} />
                            )}
                            <div className={`relative z-10 rounded-full h-8 w-8 flex items-center justify-center border-2 ${done ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground"} ${current ? "ring-2 ring-primary/30 ring-offset-2" : ""}`}>
                              <step.icon className="h-4 w-4" />
                            </div>
                            <span className={`text-[10px] mt-1 text-center font-medium ${done ? "text-primary" : "text-muted-foreground"}`}>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isCancelled && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3">
                    <AlertCircle className="h-4 w-4" />
                    {t("orderCancelledMsg")}
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">{t("orderItemsTitle")}</h3>
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {item.product?.imageUrl ? (
                          <img src={storageUrl(item.product.imageUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product?.name ?? `${t("productFallback")} #${item.id}`}</p>
                        <p className="text-xs text-muted-foreground">{t("qty")}: {item.quantity} × ৳{parseFloat(item.priceAtPurchase).toFixed(0)}</p>
                      </div>
                      <p className="text-sm font-semibold shrink-0">৳{(parseFloat(item.priceAtPurchase) * item.quantity).toFixed(0)}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {order.shippingName && (
                      <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{order.shippingName}</div>
                    )}
                    {order.shippingPhone && (
                      <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{order.shippingPhone}</div>
                    )}
                    {order.shippingAddress && (
                      <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{order.shippingAddress}{order.shippingCity ? `, ${order.shippingCity}` : ""}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t("totalAmount")}</p>
                    <p className="text-2xl font-bold text-primary">৳{parseFloat(order.totalAmount).toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
