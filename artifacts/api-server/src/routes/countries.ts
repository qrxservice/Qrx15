import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, countriesTable, citiesTable } from "@workspace/db";
import { getClientIp } from "../lib/currency";

const router: IRouter = Router();

router.get("/countries", async (_req, res): Promise<void> => {
  const countries = await db.select().from(countriesTable).orderBy(countriesTable.name);
  res.json(countries);
});

router.post("/countries", async (req, res): Promise<void> => {
  const { name, code, dialCode, flag } = req.body;
  if (!name || !code) { res.status(400).json({ error: "name and code required" }); return; }
  const [c] = await db.insert(countriesTable).values({ name, code, dialCode, flag }).returning();
  res.status(201).json(c);
});

router.get("/cities", async (req, res): Promise<void> => {
  const { countryId } = req.query as Record<string, string>;
  const conditions = countryId ? [eq(citiesTable.countryId, parseInt(countryId))] : [];
  const cities = conditions.length
    ? await db.select().from(citiesTable).where(conditions[0]).orderBy(citiesTable.name)
    : await db.select().from(citiesTable).orderBy(citiesTable.name);
  res.json(cities);
});

router.post("/cities", async (req, res): Promise<void> => {
  const { name, countryId } = req.body;
  if (!name || !countryId) { res.status(400).json({ error: "name and countryId required" }); return; }
  const [c] = await db.insert(citiesTable).values({ name, countryId }).returning();
  res.status(201).json(c);
});

router.get("/locations/detect", async (req, res): Promise<void> => {
  const ip = getClientIp(req);
  const isLocal = !ip;
  if (isLocal) {
    res.json({ country: "BD", countryName: "Bangladesh", city: null, detected: false });
    return;
  }
  try {
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city`);
    const geo = await geoRes.json() as { status: string; country: string; countryCode: string; city: string };
    if (geo.status === "success") {
      res.json({ country: geo.countryCode, countryName: geo.country, city: geo.city, detected: true });
    } else {
      res.json({ country: "BD", countryName: "Bangladesh", city: null, detected: false });
    }
  } catch {
    res.json({ country: "BD", countryName: "Bangladesh", city: null, detected: false });
  }
});

export default router;
