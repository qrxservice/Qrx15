import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListShopProducts } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ShoppingCart, Star, Package, Zap, Heart, ChevronRight } from "lucide-react";
import { storageUrl } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAddToCart } from "@workspace/api-client-react";

const CATEGORIES = [
  { id: "all", label: "All Products", icon: "🛍️" },
  { id: "devices", label: "Health Devices", icon: "🩺" },
  { id: "supplements", label: "Supplements", icon: "💊" },
  { id: "personal-care", label: "Personal Care", icon: "🧴" },
  { id: "equipment", label: "Medical Equipment", icon: "⚕️" },
  { id: "otc", label: "OTC Medicines", icon: "💉" },
];

function StarRating({ rating }: { rating?: string | null }) {
  const r = parseFloat(rating ?? "0");
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3 w-3 ${i <= r ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function ProductCard({ product, onAddToCart }: { product: any; onAddToCart: (p: any) => void }) {
  const discount = product.originalPrice
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)
    : 0;

  return (
    <Card className="group overflow-hidden border hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      <Link href={`/shop/${product.id}`}>
        <div className="relative bg-muted/30 aspect-square overflow-hidden">
          {product.imageUrl ? (
            <img src={storageUrl(product.imageUrl)} alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {CATEGORIES.find(c => c.id === product.category)?.icon ?? "📦"}
            </div>
          )}
          {discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs px-1.5">-{discount}%</Badge>
          )}
          {product.isFeatured && (
            <Badge className="absolute top-2 right-2 bg-primary text-xs px-1.5">Featured</Badge>
          )}
          {product.stockQty === 0 && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">Out of stock</span>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="mb-2">
          <Badge variant="secondary" className="text-xs mb-1.5">
            {CATEGORIES.find(c => c.id === product.category)?.label ?? product.category}
          </Badge>
          <Link href={`/shop/${product.id}`}>
            <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
        </div>
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <StarRating rating={product.rating} />
            <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
          </div>
        )}
        <div className="flex items-end gap-1.5 mb-3">
          <span className="text-lg font-bold text-primary">৳{product.price}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through mb-0.5">৳{product.originalPrice}</span>
          )}
        </div>
        <Button size="sm" className="w-full gap-1.5" disabled={product.stockQty === 0}
          onClick={() => onAddToCart(product)}>
          <ShoppingCart className="h-3.5 w-3.5" />
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ShopPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const addToCart = useAddToCart();

  const { data, isLoading } = useListShopProducts(
    { category: category === "all" ? undefined : category, search: search || undefined, page, limit: 12 },
    { query: { queryKey: ["shopProducts", category, search, page] } }
  );

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  const handleAddToCart = async (product: any) => {
    if (!user) {
      toast({ title: "Login required", description: "Please login or create an account to add items to cart." });
      setLocation("/login");
      return;
    }
    try {
      await addToCart.mutateAsync({ data: { productId: product.id, quantity: 1 } });
      toast({ title: "Added to cart!", description: product.name });
    } catch {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
  };

  return (
    <PublicLayout>
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <Badge className="bg-white/20 text-white border-white/30 mb-3">Medical Shop</Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Health Products Store</h1>
              <p className="text-white/80 text-lg">Quality medical devices, supplements, and healthcare essentials</p>
            </div>
            <div className="flex gap-4 text-center">
              <div className="bg-white/10 rounded-xl px-6 py-3">
                <div className="text-2xl font-bold">{total}+</div>
                <div className="text-xs text-white/70">Products</div>
              </div>
              <div className="bg-white/10 rounded-xl px-6 py-3">
                <div className="text-2xl font-bold">100%</div>
                <div className="text-xs text-white/70">Authentic</div>
              </div>
              <div className="bg-white/10 rounded-xl px-6 py-3">
                <div className="text-2xl font-bold">Fast</div>
                <div className="text-xs text-white/70">Delivery</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Cart shortcut */}
        {user && (
          <div className="flex justify-end mb-4">
            <Button variant="outline" className="gap-2" onClick={() => setLocation("/shop/cart")}>
              <ShoppingCart className="h-4 w-4" />
              View Cart
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-lg mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search products..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button key={cat.id}
              onClick={() => { setCategory(cat.id); setPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all
                ${category === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary hover:text-primary"}`}>
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">Try a different category or search term</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Showing {products.length} of {total} products</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}

        {/* Features strip */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t pt-10">
          {[
            { icon: Zap, title: "Fast Delivery", desc: "Same-day delivery in Dhaka" },
            { icon: Heart, title: "Authentic Products", desc: "100% genuine healthcare items" },
            { icon: Package, title: "Easy Returns", desc: "7-day hassle-free returns" },
          ].map(f => (
            <div key={f.title} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm">{f.title}</div>
                <div className="text-xs text-muted-foreground">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
