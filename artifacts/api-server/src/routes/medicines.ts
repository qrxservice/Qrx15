import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, medicinesTable, usersTable } from "@workspace/db";
import { verifyAuthToken } from "../lib/token";

const router: IRouter = Router();

async function getRole(auth: string | undefined): Promise<string | null> {
  const claims = verifyAuthToken(auth);
  if (!claims) return null;
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, claims.userId));
    // Trust the persisted role, not the token's role claim.
    return user?.role ?? null;
  } catch { return null; }
}

router.get("/medicines", async (req, res): Promise<void> => {
  const { q, limit = "20" } = req.query as Record<string, string>;
  const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

  if (!q || q.trim().length < 1) {
    const all = await db.select().from(medicinesTable).orderBy(medicinesTable.brandName).limit(limitNum);
    res.json(all);
    return;
  }

  const term = q.trim();
  const prefix = `${term}%`;
  const contains = `%${term}%`;

  // Match across brand, generic, strength and dosage form; rank prefix/brand
  // matches ahead of substring matches, then alphabetically by brand.
  const results = await db
    .select()
    .from(medicinesTable)
    .where(
      sql`(
        ${medicinesTable.brandName} ILIKE ${contains}
        OR ${medicinesTable.genericName} ILIKE ${contains}
        OR ${medicinesTable.strength} ILIKE ${contains}
        OR ${medicinesTable.dosageForm} ILIKE ${contains}
      )`,
    )
    .orderBy(
      sql`
        CASE
          WHEN ${medicinesTable.brandName} ILIKE ${prefix} THEN 0
          WHEN ${medicinesTable.genericName} ILIKE ${prefix} THEN 1
          WHEN ${medicinesTable.brandName} ILIKE ${contains} THEN 2
          WHEN ${medicinesTable.genericName} ILIKE ${contains} THEN 3
          ELSE 4
        END
      `,
      medicinesTable.brandName,
    )
    .limit(limitNum);

  res.json(results);
});

router.post("/medicines", async (req, res): Promise<void> => {
  const role = await getRole(req.headers.authorization);
  if (role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const { brandName, genericName, strength, dosageForm, manufacturer } = req.body;
  if (!brandName) { res.status(400).json({ error: "Brand name required" }); return; }
  const [med] = await db.insert(medicinesTable).values({ brandName, genericName, strength, dosageForm, manufacturer }).returning();
  res.status(201).json(med);
});

router.put("/medicines/:id", async (req, res): Promise<void> => {
  const role = await getRole(req.headers.authorization);
  if (role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const { brandName, genericName, strength, dosageForm, manufacturer } = req.body;
  if (!brandName) { res.status(400).json({ error: "Brand name required" }); return; }
  const [med] = await db
    .update(medicinesTable)
    .set({ brandName, genericName, strength, dosageForm, manufacturer })
    .where(eq(medicinesTable.id, id))
    .returning();
  if (!med) { res.status(404).json({ error: "Not found" }); return; }
  res.json(med);
});

router.delete("/medicines/:id", async (req, res): Promise<void> => {
  const role = await getRole(req.headers.authorization);
  if (role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  await db.delete(medicinesTable).where(eq(medicinesTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
