import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, departmentsTable, specialtiesTable, locationsTable, doctorsTable } from "@workspace/db";

const router: IRouter = Router();

// Departments
router.get("/departments", async (_req, res): Promise<void> => {
  const depts = await db.select().from(departmentsTable);
  const doctors = await db.select({ departmentId: doctorsTable.departmentId }).from(doctorsTable)
    .where(eq(doctorsTable.approvalStatus, "approved"));

  const countMap: Record<number, number> = {};
  doctors.forEach(d => {
    if (d.departmentId) countMap[d.departmentId] = (countMap[d.departmentId] || 0) + 1;
  });

  res.json(depts.map(d => ({ ...d, doctorCount: countMap[d.id] || 0 })));
});

router.post("/departments", async (req, res): Promise<void> => {
  const { name, icon, description } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [dept] = await db.insert(departmentsTable).values({ name, icon, description }).returning();
  res.status(201).json({ ...dept, doctorCount: 0 });
});

router.patch("/departments/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { name, icon, description } = req.body;
  const [dept] = await db.update(departmentsTable).set({ name, icon, description }).where(eq(departmentsTable.id, id)).returning();
  if (!dept) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...dept, doctorCount: 0 });
});

router.delete("/departments/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await db.delete(departmentsTable).where(eq(departmentsTable.id, id));
  res.sendStatus(204);
});

// Specialties
router.get("/specialties", async (req, res): Promise<void> => {
  const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
  let query = db.select().from(specialtiesTable);
  if (departmentId) {
    const results = await db.select().from(specialtiesTable).where(eq(specialtiesTable.departmentId, departmentId));
    res.json(results); return;
  }
  const results = await query;
  res.json(results);
});

router.post("/specialties", async (req, res): Promise<void> => {
  const { name, departmentId } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [spec] = await db.insert(specialtiesTable).values({ name, departmentId }).returning();
  res.status(201).json(spec);
});

router.delete("/specialties/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await db.delete(specialtiesTable).where(eq(specialtiesTable.id, id));
  res.sendStatus(204);
});

// Locations
router.get("/locations", async (_req, res): Promise<void> => {
  const locs = await db.select().from(locationsTable);
  res.json(locs);
});

router.post("/locations", async (req, res): Promise<void> => {
  const { name, district } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [loc] = await db.insert(locationsTable).values({ name, district }).returning();
  res.status(201).json(loc);
});

router.delete("/locations/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await db.delete(locationsTable).where(eq(locationsTable.id, id));
  res.sendStatus(204);
});

export default router;
