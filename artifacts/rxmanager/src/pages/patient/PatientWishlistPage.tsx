import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PatientLayout } from "@/components/layout/PatientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Package, Trash2 } from "lucide-react";
import { Link } from "wouter";

interface WishlistItem {
  id: number;
  productId: number;
  product?: { id: number; name: string; price: string; imageUrl?: string };
}

export default function PatientWishlistPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  const load = () => {
    if (!token) return;
    fetch(`${apiBase}/api/patient/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setItems(data.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const remove = async (productId: number) => {
    if (!token) return;
    await fetch(`${apiBase}/api/patient/wishlist/${productId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("wishlist")}</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("loading")}</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t("noWishlistYet")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(item => (
              <Card key={item.id} className="overflow-hidden">
                <div className="h-32 bg-muted flex items-center justify-center overflow-hidden">
                  {item.product?.imageUrl ? (
                    <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                <CardContent className="pt-3 space-y-2">
                  <p className="font-medium text-sm truncate">{item.product?.name ?? `Product #${item.productId}`}</p>
                  {item.product?.price && <p className="text-sm font-semibold text-primary">৳{item.product.price}</p>}
                  <div className="flex gap-2">
                    <Link href={`/shop/${item.productId}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full text-xs">{t("viewDetails")}</Button>
                    </Link>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => remove(item.productId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
