import { useLocation } from "wouter";
import { useListMyOrders } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, ShoppingBag, ArrowLeft, MapPin, Phone, User, Clock } from "lucide-react";
import { storageUrl } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  processing: "bg-purple-100 text-purple-700 border-purple-200",
  shipped: "bg-cyan-100 text-cyan-700 border-cyan-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: orders = [], isLoading } = useListMyOrders({
    query: { queryKey: ["myOrders"], enabled: !!user }
  });

  if (!user) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login to view your orders</h2>
          <div className="flex gap-3 justify-center mt-4">
            <Button asChild><Link href="/login">Login</Link></Button>
            <Button variant="outline" asChild><Link href="/register">Create Account</Link></Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/shop")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">My Orders</h1>
          {orders.length > 0 && (
            <Badge variant="secondary">{orders.length} order{orders.length !== 1 ? "s" : ""}</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
            <Button onClick={() => setLocation("/shop")}>Browse Shop</Button>
          </div>
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
                  {/* Order items */}
                  {order.items && order.items.length > 0 && (
                    <div className="space-y-2">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {item.product?.imageUrl ? (
                              <img src={storageUrl(item.product.imageUrl)} alt="" className="w-full h-full object-cover" />
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
    </PublicLayout>
  );
}
