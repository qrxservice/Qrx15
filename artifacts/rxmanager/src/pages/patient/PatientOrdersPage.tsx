import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PatientLayout } from "@/components/layout/PatientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package, User, Phone, MapPin, Clock } from "lucide-react";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  priceAtPurchase: string;
  product?: { name: string; imageUrl?: string };
}

interface Order {
  id: number;
  status: string;
  totalAmount: string;
  createdAt: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  items: OrderItem[];
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  processing: "bg-purple-100 text-purple-700 border-purple-200",
  shipped: "bg-cyan-100 text-cyan-700 border-cyan-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export default function PatientOrdersPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase}/api/patient/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("myOrders")}</h1>
          <p className="text-muted-foreground text-sm">{t("myOrdersDesc")}</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("loading")}</p>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t("noOrdersYet")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-3 bg-muted/30">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Order #{order.id}</CardTitle>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[order.status] ?? "bg-muted text-muted-foreground"}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {order.items && order.items.length > 0 && (
                    <div className="space-y-2">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {item.product?.imageUrl ? (
                              <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product?.name ?? `Product #${item.productId}`}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ৳{item.priceAtPurchase}</p>
                          </div>
                          <p className="text-sm font-semibold shrink-0">
                            ৳{(parseFloat(item.priceAtPurchase) * item.quantity).toFixed(0)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 text-xs text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-primary">৳{parseFloat(order.totalAmount).toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
