import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PatientLayout } from "@/components/layout/PatientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Pencil, Trash2, Star, X } from "lucide-react";

interface Address {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  altPhone?: string;
  country?: string;
  division?: string;
  district?: string;
  upazila?: string;
  postalCode?: string;
  fullAddress: string;
  isDefault: boolean;
}

const emptyForm = {
  label: "Home", recipientName: "", phone: "", altPhone: "",
  country: "", division: "", district: "", upazila: "", postalCode: "", fullAddress: "", isDefault: false,
};

export default function PatientAddressesPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!token) return;
    fetch(`${apiBase}/api/patient/addresses`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAddresses(data.addresses || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (a: Address) => {
    setForm({
      label: a.label || "Home", recipientName: a.recipientName, phone: a.phone, altPhone: a.altPhone || "",
      country: a.country || "", division: a.division || "", district: a.district || "", upazila: a.upazila || "",
      postalCode: a.postalCode || "", fullAddress: a.fullAddress, isDefault: a.isDefault,
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!form.recipientName || !form.phone || !form.fullAddress) {
      toast({ title: t("errorGeneric"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `${apiBase}/api/patient/addresses/${editingId}` : `${apiBase}/api/patient/addresses`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast({ title: t("saved") });
      setShowForm(false);
      load();
    } catch {
      toast({ title: t("errorGeneric"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    await fetch(`${apiBase}/api/patient/addresses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const handleSetDefault = async (id: number) => {
    if (!token) return;
    await fetch(`${apiBase}/api/patient/addresses/${id}/default`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  return (
    <PatientLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("savedAddresses")}</h1>
            <p className="text-muted-foreground text-sm">{t("savedAddressesDesc")}</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" />{t("addAddress")}</Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("loading")}</p>
        ) : addresses.length === 0 && !showForm ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t("noAddressesYet")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {addresses.map(a => (
              <Card key={a.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{a.label}</span>
                        {a.isDefault && <Badge variant="secondary" className="text-xs gap-1"><Star className="h-3 w-3" />{t("defaultAddress")}</Badge>}
                      </div>
                      <p className="text-sm">{a.recipientName} · {a.phone}</p>
                      <p className="text-xs text-muted-foreground mt-1">{a.fullAddress}{a.upazila ? `, ${a.upazila}` : ""}{a.district ? `, ${a.district}` : ""}{a.division ? `, ${a.division}` : ""}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!a.isDefault && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleSetDefault(a.id)}>{t("setAsDefault")}</Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showForm && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{editingId ? t("editAddress") : t("addAddress")}</h3>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("addressLabel")}</Label>
                  <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("recipientName")}</Label>
                  <Input value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("phone")}</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("altPhone")}</Label>
                  <Input value={form.altPhone} onChange={e => setForm(f => ({ ...f, altPhone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("country")}</Label>
                  <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("division")}</Label>
                  <Input value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("district")}</Label>
                  <Input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("upazila")}</Label>
                  <Input value={form.upazila} onChange={e => setForm(f => ({ ...f, upazila: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("postalCode")}</Label>
                  <Input value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fullAddress")}</Label>
                <Input value={form.fullAddress} onChange={e => setForm(f => ({ ...f, fullAddress: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
                {t("setAsDefault")}
              </label>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>{saving ? t("saving") : t("saveChanges")}</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>{t("cancel")}</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PatientLayout>
  );
}
