import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetShopProduct, useAddToCart } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Star, Package, ArrowLeft, Plus, Minus, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { storageUrl } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

export default function ProductDetailPage() {
  const [, params] = useRoute("/shop/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [quantity, setQuantity] = useState(1);

  const productId = parseInt(params?.id ?? "0");
  const { data: product, isLoading } = useGetShopProduct(productId, {
    query: { queryKey: ["shopProduct", productId], enabled: !!productId }
  });
  const addToCart = useAddToCart();

  const handleAddToCart = async () => {
    if (!user) {
      toast({ title: "Login required", description: "Please login or create an account to shop." });
      setLocation("/login");
      return;
    }
    try {
      await addToCart.mutateAsync({ data: { productId, quantity } });
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast({ title: "Added to cart!", description: `${product?.name} × ${quantity}` });
    } catch {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
  };

  const rating = parseFloat(product?.rating ?? "0");

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" className="gap-2 mb-6" onClick={() => setLocation("/shop")}>
          <ArrowLeft className="h-4 w-4" /> Back to Shop
        </Button>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-6 rounded bg-muted animate-pulse" style={{ width: `${70 - i * 10}%` }} />)}
            </div>
          </div>
        ) : !product ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Product not found</h3>
            <Button className="mt-4" onClick={() => setLocation("/shop")}>Browse Shop</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Image */}
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-muted/30 aspect-square flex items-center justify-center border">
                {product.imageUrl ? (
                  <img src={storageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-24 w-24 text-muted-foreground/20" />
                )}
                {product.isFeatured && (
                  <Badge className="absolute top-4 left-4 bg-primary">Featured</Badge>
                )}
                {product.stockQty === 0 && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-5">
              <div>
                <Badge variant="secondary" className="mb-2">{product.category}</Badge>
                <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
              </div>

              {(product.reviewCount ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{product.rating} ({product.reviewCount} reviews)</span>
                </div>
              )}

              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-primary">৳{product.price}</span>
                {product.originalPrice && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-muted-foreground line-through">৳{product.originalPrice}</span>
                    <Badge className="bg-red-500 text-white">
                      -{Math.round((1 - parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)}% OFF
                    </Badge>
                  </div>
                )}
              </div>

              {product.description && (
                <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
              )}

              <div className="flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 rounded-full ${product.stockQty > 0 ? "bg-green-500" : "bg-red-500"}`} />
                <span className={product.stockQty > 0 ? "text-green-600" : "text-destructive"}>
                  {product.stockQty > 0 ? `In Stock (${product.stockQty} available)` : "Out of Stock"}
                </span>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Quantity:</span>
                  <div className="flex items-center gap-2 border rounded-lg overflow-hidden">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-10 text-center font-medium text-sm">{quantity}</span>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none"
                      onClick={() => setQuantity(q => Math.min(product.stockQty, q + 1))}
                      disabled={quantity >= product.stockQty}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button className="flex-1 gap-2" disabled={product.stockQty === 0 || addToCart.isPending}
                    onClick={handleAddToCart}>
                    <ShoppingCart className="h-4 w-4" />
                    {addToCart.isPending ? "Adding..." : "Add to Cart"}
                  </Button>
                  <Button variant="outline" onClick={() => setLocation("/shop/cart")}>View Cart</Button>
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { icon: Truck, label: "Free delivery" },
                  { icon: ShieldCheck, label: "Authentic product" },
                  { icon: RotateCcw, label: "7-day return" },
                ].map(b => (
                  <Card key={b.label} className="border-0 bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <b.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">{b.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
