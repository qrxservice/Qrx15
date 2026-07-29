import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetAppSettings, useUpdateAppSettings, getGetAppSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@workspace/object-storage-web";
import { storageUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShoppingBag, Package, Plus, Pencil, Trash2, Search, ImageIcon,
  Loader2, Tag, CheckCircle2, XCircle, ShoppingCart, Truck, Clock,
  MoreVertical, Filter, Save, AlertCircle,
} from "lucide-react";

const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("auth_token");
  return { Authorization: token ? `Bearer ${token}` : "", "Content-Type": "application/json" };
}

const CATEGORIES = ["general", "medicine", "device", "supplement", "personal-care", "baby-care", "equipment"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  processing: "bg-purple-100 text-purple-700 border-purple-200",
  shipped: "bg-cyan-100 text-cyan-700 border-cyan-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  pending_verification: "bg-orange-100 text-orange-700 border-orange-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  unpaid: "bg-muted text-muted-foreground",
  cod: "bg-slate-100 text-slate-700 border-slate-200",
};

const DELIVERY_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

interface Product {
  id: number; name: string; description?: string | null;
  price: string; originalPrice?: string | null;
  category: string; imageUrl?: string | null;
  stockQty: number; isActive: boolean; isFeatured: boolean;
  rating?: string | null; tags?: string | null; createdAt?: string | null;
}

interface OrderItem {
  id: number; orderId: number; productId: number;
  quantity: number; priceAtPurchase: string;
  product?: { name: string; imageUrl?: string | null } | null;
}

interface Order {
  id: number; userId: number; status: string;
  totalAmount: string; shippingName?: string | null;
  shippingPhone?: string | null; shippingAddress?: string | null;
  shippingCity?: string | null; notes?: string | null;
  createdAt?: string | null; items: OrderItem[];
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  qrTransactionId?: string | null;
  qrScreenshotUrl?: string | null;
}

const emptyProduct = (): Omit<Product, "id" | "createdAt"> => ({
  name: "", description: "", price: "", originalPrice: "",
  category: "general", imageUrl: "", stockQty: 0,
  isActive: true, isFeatured: false, rating: null, tags: "",
});

type Tab = "products" | "orders";

export default function AdminShopPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: appSettings } = useGetAppSettings();
  const updateAppSettings = useUpdateAppSettings({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAppSettingsQueryKey() }) },
  });

  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
  const [rejectingOrderId, setRejectingOrderId] = useState<number | null>(null);

  const imageFileRef = useRef<HTMLInputElement | null>(null);
  const { uploadFile, isUploading } = useUpload({ getAuthToken: () => localStorage.getItem("auth_token") });

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${apiBase}/api/shop/products?limit=200&page=1`, { headers: authHeaders() });
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch { toast({ title: "Failed to load products", variant: "destructive" }); }
    finally { setLoadingProducts(false); }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/shop/orders`, { headers: authHeaders() });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch { toast({ title: "Failed to load orders", variant: "destructive" }); }
    finally { setLoadingOrders(false); }
  };

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { if (activeTab === "orders") loadOrders(); }, [activeTab]);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setForm(emptyProduct());
    setShowProductDialog(true);
  };

  const openEditDialog = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name, description: p.description ?? "",
      price: p.price, originalPrice: p.originalPrice ?? "",
      category: p.category, imageUrl: p.imageUrl ?? "",
      stockQty: p.stockQty, isActive: p.isActive,
      isFeatured: p.isFeatured, rating: p.rating ?? null, tags: p.tags ?? "",
    });
    setShowProductDialog(true);
  };

  const handleImageUpload = async (file: File) => {
    try {
      const res = await uploadFile(file);
      if (!res) throw new Error("upload failed");
      setForm(f => ({ ...f, imageUrl: res.objectPath }));
    } catch { toast({ title: "Image upload failed", variant: "destructive" }); }
  };

  const saveProduct = async () => {
    if (!form.name.trim()) { toast({ title: "Product name required", variant: "destructive" }); return; }
    if (!form.price) { toast({ title: "Price required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), description: form.description || null,
        price: form.price, originalPrice: form.originalPrice || null,
        category: form.category, imageUrl: form.imageUrl || null,
        stockQty: Number(form.stockQty), isActive: form.isActive,
        isFeatured: form.isFeatured, tags: form.tags || null,
      };
      let res;
      if (editingProduct) {
        res = await fetch(`${apiBase}/api/shop/products/${editingProduct.id}`, {
          method: "PUT", headers: authHeaders(), body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${apiBase}/api/shop/products`, {
          method: "POST", headers: authHeaders(), body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error("Save failed");
      toast({ title: editingProduct ? "Product updated" : "Product created" });
      setShowProductDialog(false);
      loadProducts();
    } catch { toast({ title: "Failed to save product", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${apiBase}/api/shop/products/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
      toast({ title: "Product deleted" });
      setProducts(p => p.filter(x => x.id !== id));
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
    finally { setDeletingId(null); }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`${apiBase}/api/admin/shop/orders/${orderId}/status`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Order status updated" });
      setOrders(o => o.map(ord => ord.id === orderId ? { ...ord, status } : ord));
    } catch { toast({ title: "Failed to update status", variant: "destructive" }); }
    finally { setUpdatingOrderId(null); }
  };

  const verifyQrPayment = async (orderId: number) => {
    setVerifyingOrderId(orderId);
    try {
      const res = await fetch(`${apiBase}/api/admin/shop/orders/${orderId}/verify-payment`, {
        method: "PUT", headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Payment verified — order confirmed ✓" });
      setOrders(o => o.map(ord => ord.id === orderId ? { ...ord, paymentStatus: "paid", status: "confirmed" } : ord));
    } catch { toast({ title: "Failed to verify payment", variant: "destructive" }); }
    finally { setVerifyingOrderId(null); }
  };

  const rejectQrPayment = async (orderId: number) => {
    if (!confirm("Reject this payment? The order will be cancelled.")) return;
    setRejectingOrderId(orderId);
    try {
      const res = await fetch(`${apiBase}/api/admin/shop/orders/${orderId}/reject-payment`, {
        method: "PUT", headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Payment rejected — order cancelled" });
      setOrders(o => o.map(ord => ord.id === orderId ? { ...ord, paymentStatus: "rejected", status: "cancelled" } : ord));
    } catch { toast({ title: "Failed to reject payment", variant: "destructive" }); }
    finally { setRejectingOrderId(null); }
  };

  const toggleShopEnabled = async (v: boolean) => {
    try {
      await updateAppSettings.mutateAsync({ data: { shopEnabled: v } });
      toast({ title: v ? "Shop enabled" : "Shop disabled" });
    } catch { toast({ title: "Failed to toggle shop", variant: "destructive" }); }
  };

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const pendingQrCount = orders.filter(o => o.paymentStatus === "pending_verification").length;

  const filteredOrders = orders
    .filter(o => {
      const matchStatus = orderStatusFilter === "all"
        ? true
        : orderStatusFilter === "qr_pending"
          ? o.paymentStatus === "pending_verification"
          : o.status === orderStatusFilter;
      const matchSearch = !orderSearch ||
        String(o.id).includes(orderSearch) ||
        (o.shippingName ?? "").toLowerCase().includes(orderSearch.toLowerCase()) ||
        (o.shippingPhone ?? "").includes(orderSearch) ||
        (o.qrTransactionId ?? "").toLowerCase().includes(orderSearch.toLowerCase());
      return matchStatus && matchSearch;
    })
    // Pending QR verification always floats to the top
    .sort((a, b) => {
      const ap = a.paymentStatus === "pending_verification" ? 0 : 1;
      const bp = b.paymentStatus === "pending_verification" ? 0 : 1;
      return ap - bp;
    });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" />Shop Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Manage products, orders, and shop settings</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Shop {appSettings?.shopEnabled !== false ? "ON" : "OFF"}</span>
            <Switch
              checked={appSettings?.shopEnabled !== false}
              onCheckedChange={toggleShopEnabled}
              disabled={updateAppSettings.isPending}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {(["products", "orders"] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tab === "products"
                ? <span className="flex items-center gap-1.5"><Package className="h-4 w-4" />Products</span>
                : <span className="flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4" />Orders
                    {pendingQrCount > 0 && (
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {pendingQrCount}
                      </span>
                    )}
                  </span>}
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
              </div>
              <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No products yet</p>
                <Button variant="outline" className="mt-3" onClick={openCreateDialog}><Plus className="h-4 w-4 mr-1" />Add First Product</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                  <Card key={p.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {p.imageUrl ? (
                        <img src={storageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${p.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-muted text-muted-foreground"}`}>
                          {p.isActive ? "Published" : "Draft"}
                        </span>
                        {p.isFeatured && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Featured</span>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-2">
                        <p className="font-semibold text-sm line-clamp-1">{p.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{p.category}</p>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-bold text-primary">৳{parseFloat(p.price).toFixed(0)}</span>
                        {p.originalPrice && parseFloat(p.originalPrice) > 0 && (
                          <span className="text-xs text-muted-foreground line-through">৳{parseFloat(p.originalPrice).toFixed(0)}</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">Stock: {p.stockQty}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEditDialog(p)}>
                          <Pencil className="h-3 w-3 mr-1" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteProduct(p.id)} disabled={deletingId === p.id}>
                          {deletingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search by order #, name, or phone..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
              </div>
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="qr_pending">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                      QR Pending Verification
                      {pendingQrCount > 0 && <span className="text-orange-600 font-bold">({pendingQrCount})</span>}
                    </span>
                  </SelectItem>
                  {DELIVERY_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={loadOrders} disabled={loadingOrders}>
                {loadingOrders ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              </Button>
            </div>

            {loadingOrders ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No orders found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm">Order #{order.id}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                              {order.paymentStatus && order.paymentStatus !== "unpaid" && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PAYMENT_STATUS_COLORS[order.paymentStatus] ?? "bg-muted"}`}>
                                  {order.paymentStatus === "pending_verification" ? "QR Unverified" :
                                   order.paymentStatus === "paid" ? "Paid ✓" :
                                   order.paymentStatus === "rejected" ? "Rejected" :
                                   order.paymentStatus}
                                </span>
                              )}
                              {order.paymentMethod === "bangla_qr" && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                                  Bangla QR
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </div>
                          </div>
                          <div className="text-xs space-y-0.5 text-muted-foreground">
                            {order.shippingName && <div className="font-medium text-foreground">{order.shippingName}</div>}
                            {order.shippingPhone && <div>{order.shippingPhone}</div>}
                            {order.shippingAddress && <div>{order.shippingAddress}{order.shippingCity ? `, ${order.shippingCity}` : ""}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="font-bold text-primary">৳{parseFloat(order.totalAmount).toFixed(0)}</div>
                          </div>
                          <Select
                            value={order.status}
                            onValueChange={v => updateOrderStatus(order.id, v)}
                            disabled={updatingOrderId === order.id}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              {updatingOrderId === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue />}
                            </SelectTrigger>
                            <SelectContent>
                              {DELIVERY_STATUSES.map(s => (
                                <SelectItem key={s} value={s} className="capitalize text-xs">
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* QR Payment Verification Banner */}
                      {order.paymentMethod === "bangla_qr" && order.paymentStatus === "pending_verification" && (
                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-orange-600 shrink-0" />
                            <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">QR Payment Awaiting Verification</span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Transaction ID:{" "}
                            <span className="font-mono font-semibold text-foreground select-all">{order.qrTransactionId}</span>
                          </div>
                          {order.qrScreenshotUrl && (
                            <a
                              href={storageUrl(order.qrScreenshotUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary underline underline-offset-2 mb-2 inline-block"
                            >
                              View payment screenshot ↗
                            </a>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white flex-1"
                              onClick={() => verifyQrPayment(order.id)}
                              disabled={verifyingOrderId === order.id || rejectingOrderId === order.id}
                            >
                              {verifyingOrderId === order.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                              Verify & Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive flex-1"
                              onClick={() => rejectQrPayment(order.id)}
                              disabled={verifyingOrderId === order.id || rejectingOrderId === order.id}
                            >
                              {rejectingOrderId === order.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}

                      {order.items && order.items.length > 0 && (
                        <>
                          <Separator className="my-3" />
                          <div className="flex flex-wrap gap-2">
                            {order.items.map(item => (
                              <div key={item.id} className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1 text-xs">
                                <span className="font-medium">{item.product?.name ?? `#${item.productId}`}</span>
                                <span className="text-muted-foreground">×{item.quantity}</span>
                                <span className="text-muted-foreground">৳{(parseFloat(item.priceAtPurchase) * item.quantity).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Product Name *</Label>
              <Input placeholder="e.g. Paracetamol 500mg" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c.replace(/-/g, " ").charAt(0).toUpperCase() + c.replace(/-/g, " ").slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stock Quantity</Label>
                <Input type="number" min="0" placeholder="0" value={form.stockQty}
                  onChange={e => setForm(f => ({ ...f, stockQty: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (৳) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Original Price (৳) <span className="text-xs text-muted-foreground">(before discount)</span></Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.originalPrice ?? ""}
                  onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Product description..." rows={3} value={form.description ?? ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Product Image</Label>
              <div className="flex gap-2">
                <Input placeholder="Image URL" value={form.imageUrl ?? ""}
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
                <Button type="button" variant="outline" size="icon" onClick={() => imageFileRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
                <input ref={imageFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
              </div>
              {form.imageUrl && (
                <img src={storageUrl(form.imageUrl)} alt="" className="h-24 w-full object-cover rounded-lg border mt-1" />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tags <span className="text-xs text-muted-foreground">(comma separated)</span></Label>
              <Input placeholder="e.g. fever, headache, pain relief" value={form.tags ?? ""}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="pub" checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <Label htmlFor="pub">{form.isActive ? "Published" : "Draft"}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="feat" checked={form.isFeatured} onCheckedChange={v => setForm(f => ({ ...f, isFeatured: v }))} />
                <Label htmlFor="feat">Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>Cancel</Button>
            <Button onClick={saveProduct} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Product</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
