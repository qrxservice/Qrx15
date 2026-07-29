import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useGetMyCart, useRemoveFromCart, useUpdateCartItem, usePlaceOrder, useGetPaymentGatewaysStatus } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ShoppingCart, Trash2, Plus, Minus, Package, ArrowLeft, CheckCircle2,
  Truck, MapPin, CreditCard, Banknote, Loader2, Wifi, QrCode, Copy, Upload, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface SavedAddress {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  upazila?: string;
  district?: string;
  division?: string;
  isDefault: boolean;
}

interface BanglaQrConfig {
  enabled: boolean;
  merchantName: string | null;
  qrImageUrl: string | null;
  paymentInstructions: string | null;
  successMessage: string | null;
  failureMessage: string | null;
}

function storageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("/objects/")) return `/api/storage${path}`;
  return path;
}

export default function CartPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online" | "bangla_qr">("cod");
  const [redirectingToGateway, setRedirectingToGateway] = useState(false);
  const [shippingForm, setShippingForm] = useState({ shippingName: "", shippingPhone: "", shippingAddress: "", shippingCity: "", notes: "" });
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "new" | null>(null);
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Bangla QR state
  const [banglaQrConfig, setBanglaQrConfig] = useState<BanglaQrConfig | null>(null);
  const [qrOrderId, setQrOrderId] = useState<number | null>(null);
  const [qrOrderAmount, setQrOrderAmount] = useState<string>("0"); // preserved after cart clears
  const [qrTransactionId, setQrTransactionId] = useState("");
  const [qrConfirming, setQrConfirming] = useState(false);
  const [qrDone, setQrDone] = useState(false);

  const { data: cartItems = [], isLoading } = useGetMyCart({ query: { queryKey: ["cart"], enabled: !!user } });
  const { data: gatewayStatus } = useGetPaymentGatewaysStatus();
  const removeItem = useRemoveFromCart();
  const updateItem = useUpdateCartItem();
  const placeOrder = usePlaceOrder();
  // Online payment is available if ANY redirect-based gateway is enabled
  const onlinePayAvailable = !!(gatewayStatus?.sslcommerz || gatewayStatus?.shurjopay || gatewayStatus?.aamarpay);
  const banglaQrAvailable = !!gatewayStatus?.bangla_qr;

  /** Pick the first enabled redirect-based gateway for shop orders. */
  const pickOnlineGateway = (): "sslcommerz" | "shurjopay" | "aamarpay" | null => {
    if (gatewayStatus?.sslcommerz) return "sslcommerz";
    if (gatewayStatus?.shurjopay) return "shurjopay";
    if (gatewayStatus?.aamarpay) return "aamarpay";
    return null;
  };

  // Fetch Bangla QR config when available
  useEffect(() => {
    if (!banglaQrAvailable) return;
    fetch(`${apiBase}/api/payment-gateways/bangla-qr/config`)
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setBanglaQrConfig(data))
      .catch(() => {});
  }, [banglaQrAvailable, apiBase]);

  useEffect(() => {
    if (!token || user?.role !== "patient") return;
    fetch(`${apiBase}/api/patient/addresses`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const addresses: SavedAddress[] = data.addresses || [];
        setSavedAddresses(addresses);
        const def = addresses.find(a => a.isDefault) || addresses[0];
        if (def) {
          setSelectedAddressId(def.id);
          setShippingForm(f => ({
            ...f,
            shippingName: def.recipientName,
            shippingPhone: def.phone,
            shippingAddress: def.fullAddress,
            shippingCity: def.upazila || def.district || def.division || "",
          }));
        }
      })
      .catch(() => {});
  }, [token, user]);

  const applyAddress = (id: number | "new") => {
    setSelectedAddressId(id);
    if (id === "new") {
      setShippingForm({ shippingName: "", shippingPhone: "", shippingAddress: "", shippingCity: "", notes: shippingForm.notes });
      return;
    }
    const addr = savedAddresses.find(a => a.id === id);
    if (addr) {
      setShippingForm(f => ({
        ...f,
        shippingName: addr.recipientName,
        shippingPhone: addr.phone,
        shippingAddress: addr.fullAddress,
        shippingCity: addr.upazila || addr.district || addr.division || "",
      }));
    }
  };

  if (!user) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login to view your cart</h2>
          <p className="text-muted-foreground mb-6">You need an account to add items and checkout.</p>
          <div className="flex gap-3 justify-center">
            <Button asChild><Link href="/login">Login</Link></Button>
            <Button variant="outline" asChild><Link href="/register">Create Account</Link></Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ── QR transaction confirmed successfully
  if (qrDone) {
    const successMsg = banglaQrConfig?.successMessage || "আপনার পেমেন্ট তথ্য পাওয়া গেছে। যাচাই হলে আপনাকে জানানো হবে।";
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Submitted!</h2>
          <p className="text-muted-foreground mb-2">{successMsg}</p>
          {qrTransactionId && (
            <p className="text-sm text-muted-foreground mb-6">Transaction ID: <span className="font-mono font-medium text-foreground">{qrTransactionId}</span></p>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setLocation("/shop/orders")}>View My Orders</Button>
            <Button variant="outline" onClick={() => setLocation("/shop")}>Continue Shopping</Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ── Standard COD order placed
  if (orderPlaced) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
          <p className="text-muted-foreground mb-6">Your order has been placed successfully. We'll contact you to confirm.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setLocation("/shop/orders")}>View My Orders</Button>
            <Button variant="outline" onClick={() => setLocation("/shop")}>Continue Shopping</Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ── Bangla QR Payment screen (after order placed, before customer confirms)
  // Compute total before any early returns so QR screen can reference it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cartItemsTotal = cartItems.reduce((sum: number, item: any) => sum + parseFloat(item.product?.price ?? "0") * item.quantity, 0);

  if (qrOrderId !== null) {
    const qrUrl = storageUrl(banglaQrConfig?.qrImageUrl);
    const instructions = banglaQrConfig?.paymentInstructions || "নিচের QR কোডটি স্ক্যান করুন এবং পেমেন্ট করুন। পেমেন্টের পর Transaction ID লিখুন।";
    const amount = parseFloat(qrOrderAmount).toFixed(0);
    const orderRef = `ORD-${String(qrOrderId).padStart(6, "0")}`;

    const handleQrConfirm = async () => {
      if (!qrTransactionId.trim()) {
        toast({ title: "Transaction ID is required", variant: "destructive" }); return;
      }
      setQrConfirming(true);
      try {
        const res = await fetch(`${apiBase}/api/shop/orders/${qrOrderId}/pay/bangla-qr`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ transactionId: qrTransactionId.trim() }),
        });
        if (!res.ok) throw new Error("Failed");
        setQrDone(true);
      } catch {
        toast({ title: "Failed to confirm payment. Please try again.", variant: "destructive" });
      } finally {
        setQrConfirming(false);
      }
    };

    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-3">
              <QrCode className="h-4 w-4" /> Bangla QR Payment
            </div>
            <h1 className="text-2xl font-bold">Scan to Pay</h1>
            {banglaQrConfig?.merchantName && (
              <p className="text-muted-foreground mt-1">{banglaQrConfig.merchantName}</p>
            )}
          </div>

          {/* QR Code Image */}
          <Card className="mb-4">
            <CardContent className="pt-6 pb-4 flex flex-col items-center gap-3">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="Bangla QR Code"
                  className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] h-auto object-contain rounded-xl border-2 border-border bg-white p-3"
                />
              ) : (
                <div className="w-64 h-64 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground">
                  <QrCode className="h-20 w-20 opacity-20" />
                </div>
              )}

              {/* Order details under QR */}
              <div className="w-full max-w-[360px] rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                {banglaQrConfig?.merchantName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Merchant</span>
                    <span className="font-medium">{banglaQrConfig.merchantName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-primary text-base">৳{amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Order Ref</span>
                  <span className="font-mono font-medium flex items-center gap-1">
                    {orderRef}
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(orderRef); toast({ title: "Copied!" }); }}
                      className="text-muted-foreground hover:text-foreground ml-0.5"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <p className="text-sm text-center text-muted-foreground max-w-[360px] leading-relaxed">
                {instructions}
              </p>
            </CardContent>
          </Card>

          {/* Transaction ID confirmation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Confirm Your Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Transaction ID <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Enter your transaction ID"
                  value={qrTransactionId}
                  onChange={e => setQrTransactionId(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  পেমেন্টের পর আপনার ব্যাংকিং অ্যাপ থেকে Transaction ID সংগ্রহ করুন
                </p>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleQrConfirm}
                disabled={qrConfirming || !qrTransactionId.trim()}
              >
                {qrConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {qrConfirming ? "Confirming…" : "Confirm Payment"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                পেমেন্ট করার পর Transaction ID দিয়ে কনফার্ম করুন। আমরা যাচাই করে আপনার অর্ডার প্রসেস করব।
              </p>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  const total = cartItemsTotal;

  const handleQuantity = async (id: number, q: number) => {
    if (q < 1) return;
    await updateItem.mutateAsync({ id, data: { productId: 0, quantity: q } });
    qc.invalidateQueries({ queryKey: ["cart"] });
  };

  const handleRemove = async (id: number) => {
    await removeItem.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: ["cart"] });
    toast({ title: "Item removed" });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingForm.shippingName || !shippingForm.shippingPhone || !shippingForm.shippingAddress || !shippingForm.shippingCity) {
      toast({ title: "Please fill all shipping fields", variant: "destructive" }); return;
    }

    try {
      const order = await placeOrder.mutateAsync({ data: shippingForm });
      qc.invalidateQueries({ queryKey: ["cart"] });
      const orderId = (order as { id: number }).id;

      if (paymentMethod === "online") {
        const gateway = pickOnlineGateway();
        if (!gateway) {
          toast({ title: "No online payment gateway is currently available", variant: "destructive" });
          setOrderPlaced(true);
          return;
        }
        setRedirectingToGateway(true);
        try {
          const payRes = await fetch(`${apiBase}/api/shop/orders/${orderId}/pay/${gateway}`, {
            method: "POST",
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          const payData = await payRes.json();
          if (payData?.url) {
            window.location.href = payData.url;
            return;
          }
          throw new Error("No gateway URL returned");
        } catch {
          toast({ title: "Online payment failed", description: "Your order was placed. Please pay from My Orders.", variant: "destructive" });
          setRedirectingToGateway(false);
          setOrderPlaced(true);
        }
      } else if (paymentMethod === "bangla_qr") {
        // Store amount from order (cart will be cleared), then show QR screen
        const orderAmount = (order as { totalAmount?: string; id: number }).totalAmount ?? total.toFixed(2);
        setQrOrderAmount(orderAmount);
        setQrOrderId(orderId);
      } else {
        setOrderPlaced(true);
      }
    } catch {
      toast({ title: "Order failed", variant: "destructive" });
    }
  };

  const isBusy = placeOrder.isPending || redirectingToGateway;

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/shop")}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          {cartItems.length > 0 && <Badge variant="secondary">{cartItems.length} items</Badge>}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">Add products from the shop</p>
            <Button onClick={() => setLocation("/shop")}>Browse Shop</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(cartItems as any[]).map((item: any) => (
                <Card key={item.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {item.product?.imageUrl ? (
                        <img src={storageUrl(item.product.imageUrl)} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{item.product?.name}</h3>
                      <p className="text-primary font-semibold text-sm mt-0.5">৳{item.product?.price}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => handleQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => handleQuantity(item.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right shrink-0 min-w-[60px]">
                      <p className="font-semibold text-sm">৳{(parseFloat(item.product?.price ?? "0") * item.quantity).toFixed(0)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => handleRemove(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary / Checkout */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(cartItems as any[]).map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[140px]">{item.product?.name} × {item.quantity}</span>
                      <span className="font-medium">৳{(parseFloat(item.product?.price ?? "0") * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span className="text-green-600 font-medium">Free</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary text-lg">৳{total.toFixed(0)}</span>
                  </div>
                  <Button className="w-full gap-2 mt-2" onClick={() => setCheckoutMode(true)} disabled={checkoutMode}>
                    <Truck className="h-4 w-4" />
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </Card>

              {checkoutMode && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Shipping Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {savedAddresses.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <Label className="text-xs flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Saved Addresses</Label>
                        <div className="space-y-2">
                          {savedAddresses.map(addr => (
                            <button type="button" key={addr.id}
                              onClick={() => applyAddress(addr.id)}
                              className={`w-full text-left text-xs p-2.5 rounded-lg border transition-colors ${selectedAddressId === addr.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                              <span className="font-medium">{addr.label}</span> — {addr.recipientName}, {addr.phone}
                              <br />
                              <span className="text-muted-foreground">{addr.fullAddress}</span>
                            </button>
                          ))}
                          <button type="button" onClick={() => applyAddress("new")}
                            className={`w-full text-left text-xs p-2.5 rounded-lg border transition-colors ${selectedAddressId === "new" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                            + Use a new address
                          </button>
                        </div>
                        <Separator />
                      </div>
                    )}
                    <form onSubmit={handlePlaceOrder} className="space-y-3">
                      <div>
                        <Label className="text-xs">Full Name</Label>
                        <Input placeholder="Recipient name" value={shippingForm.shippingName}
                          onChange={e => setShippingForm(f => ({ ...f, shippingName: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Phone</Label>
                        <Input placeholder="01XXXXXXXXX" value={shippingForm.shippingPhone}
                          onChange={e => setShippingForm(f => ({ ...f, shippingPhone: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Address</Label>
                        <Input placeholder="Street address" value={shippingForm.shippingAddress}
                          onChange={e => setShippingForm(f => ({ ...f, shippingAddress: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input placeholder="Dhaka, Chittagong..." value={shippingForm.shippingCity}
                          onChange={e => setShippingForm(f => ({ ...f, shippingCity: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Notes (optional)</Label>
                        <Input placeholder="Delivery instructions..." value={shippingForm.notes}
                          onChange={e => setShippingForm(f => ({ ...f, notes: e.target.value }))} />
                      </div>

                      {/* Payment Method */}
                      <div className="pt-1">
                        <Label className="text-xs mb-2 block">Payment Method</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {/* Cash on Delivery */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("cod")}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors ${paymentMethod === "cod" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted/50"}`}
                          >
                            <Banknote className="h-4 w-4 shrink-0" />
                            <div className="text-left">
                              <div>Cash on Delivery</div>
                              <div className="text-xs font-normal text-muted-foreground">Pay when your order arrives</div>
                            </div>
                            {paymentMethod === "cod" && <div className="ml-auto h-2 w-2 rounded-full bg-primary" />}
                          </button>

                          {/* Bangla QR Payment */}
                          {banglaQrAvailable && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("bangla_qr")}
                              className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors ${paymentMethod === "bangla_qr" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted/50"}`}
                            >
                              <QrCode className="h-4 w-4 shrink-0" />
                              <div className="text-left">
                                <div>Bangla QR Payment</div>
                                <div className="text-xs font-normal text-muted-foreground">
                                  Scan QR with any Bangla QR-supported banking app
                                </div>
                              </div>
                              {paymentMethod === "bangla_qr" && <div className="ml-auto h-2 w-2 rounded-full bg-primary" />}
                            </button>
                          )}

                          {/* Online Payment (dynamic gateway) */}
                          {onlinePayAvailable && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("online")}
                              className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors ${paymentMethod === "online" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted/50"}`}
                            >
                              <Wifi className="h-4 w-4 shrink-0" />
                              <div className="text-left">
                                <div>Online Payment</div>
                                <div className="text-xs font-normal text-muted-foreground">Card, mobile banking & internet banking</div>
                              </div>
                              {paymentMethod === "online" && <div className="ml-auto h-2 w-2 rounded-full bg-primary" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <Button type="submit" className="w-full gap-2" disabled={isBusy}>
                        {isBusy ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {redirectingToGateway ? "Redirecting to payment…" : "Placing order…"}
                          </>
                        ) : paymentMethod === "online" ? (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Pay Online • ৳{total.toFixed(0)}
                          </>
                        ) : paymentMethod === "bangla_qr" ? (
                          <>
                            <QrCode className="h-4 w-4" />
                            Place Order & Show QR • ৳{total.toFixed(0)}
                          </>
                        ) : (
                          <>
                            <Banknote className="h-4 w-4" />
                            Place Order (COD) • ৳{total.toFixed(0)}
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
