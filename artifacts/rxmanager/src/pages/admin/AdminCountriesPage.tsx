import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListCountries, useListCities, useCreateCountry } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, MapPin, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminCountriesPage() {
  const { toast } = useToast();
  const { data: countries, refetch: refetchCountries } = useListCountries();
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const { data: cities } = useListCities({ countryId: selectedCountry ? Number(selectedCountry) : undefined });

  const createCountry = useCreateCountry();
  const [countryDialog, setCountryDialog] = useState(false);
  const [countryForm, setCountryForm] = useState({ name: "", code: "", dialCode: "", flag: "" });

  const [cityDialog, setCityDialog] = useState(false);
  const [cityForm, setCityForm] = useState({ name: "", countryId: "" });

  const handleCountrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCountry.mutateAsync({ data: { name: countryForm.name, code: countryForm.code, dialCode: countryForm.dialCode || undefined, flag: countryForm.flag || undefined } });
      toast({ title: "Country added" });
      refetchCountries();
      setCountryDialog(false);
      setCountryForm({ name: "", code: "", dialCode: "", flag: "" });
    } catch { toast({ title: "Failed to add country", variant: "destructive" }); }
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityForm.countryId) return;
    try {
      const res = await fetch("/api/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cityForm.name, countryId: Number(cityForm.countryId) }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "City added" });
      setCityDialog(false);
      setCityForm({ name: "", countryId: "" });
    } catch { toast({ title: "Failed to add city", variant: "destructive" }); }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Countries & Cities</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage the international location system for doctor profiles</p>
        </div>

        <div className="flex gap-3">
          <Button size="sm" onClick={() => setCountryDialog(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /><Globe className="mr-1.5 h-3.5 w-3.5" />Add Country
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCityDialog(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /><MapPin className="mr-1.5 h-3.5 w-3.5" />Add City
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Countries list */}
          <div>
            <h2 className="font-semibold mb-3">Countries ({countries?.length ?? 0})</h2>
            <div className="space-y-2">
              {countries?.map(c => (
                <Card key={c.id} className={selectedCountry === String(c.id) ? "border-primary" : "cursor-pointer"} onClick={() => setSelectedCountry(String(c.id))}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.flag || "🌍"}</span>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.code} {c.dialCode && `· ${c.dialCode}`}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Click to view cities</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cities for selected country */}
          <div>
            <h2 className="font-semibold mb-3">
              Cities {selectedCountry ? `— ${countries?.find(c => String(c.id) === selectedCountry)?.name}` : "(select a country)"}
            </h2>
            {!selectedCountry ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Select a country to view its cities</CardContent></Card>
            ) : cities?.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No cities added for this country yet</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cities?.map(city => (
                  <Card key={city.id}><CardContent className="p-3 text-sm">{city.name}</CardContent></Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Country dialog */}
      <Dialog open={countryDialog} onOpenChange={setCountryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Country</DialogTitle></DialogHeader>
          <form onSubmit={handleCountrySubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Country Name *</Label><Input required value={countryForm.name} onChange={e => setCountryForm(f => ({ ...f, name: e.target.value }))} placeholder="Bangladesh" /></div>
              <div className="space-y-1.5"><Label>Country Code *</Label><Input required value={countryForm.code} onChange={e => setCountryForm(f => ({ ...f, code: e.target.value }))} placeholder="BD" maxLength={3} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Dial Code</Label><Input value={countryForm.dialCode} onChange={e => setCountryForm(f => ({ ...f, dialCode: e.target.value }))} placeholder="+880" /></div>
              <div className="space-y-1.5"><Label>Flag Emoji</Label><Input value={countryForm.flag} onChange={e => setCountryForm(f => ({ ...f, flag: e.target.value }))} placeholder="🇧🇩" /></div>
            </div>
            <Button type="submit" className="w-full" disabled={createCountry.isPending}>Add Country</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* City dialog */}
      <Dialog open={cityDialog} onOpenChange={setCityDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add City</DialogTitle></DialogHeader>
          <form onSubmit={handleCitySubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Country *</Label>
              <Select value={cityForm.countryId} onValueChange={v => setCityForm(f => ({ ...f, countryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>{countries?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.flag} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>City Name *</Label><Input required value={cityForm.name} onChange={e => setCityForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dhaka" /></div>
            <Button type="submit" className="w-full">Add City</Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
