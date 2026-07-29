import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, menuItemsTable } from "@workspace/db";
import { getActor, writeAudit } from "../lib/admin";

const router: IRouter = Router();

const LOCATIONS = ["header", "footer", "both"] as const;

function serialize(m: typeof menuItemsTable.$inferSelect) {
  return {
    ...m,
    createdAt: m.createdAt.toISOString(),
  };
}

function normalizeLocation(value: unknown): typeof LOCATIONS[number] {
  return LOCATIONS.includes(value as typeof LOCATIONS[number]) ? (value as typeof LOCATIONS[number]) : "header";
}

// Allow only http(s) absolute URLs or relative paths. Reject dangerous schemes
// (javascript:, data:, etc.) since these links are rendered on public pages.
function isSafeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^\/(?!\/)/.test(trimmed)) return true;
  return false;
}

// Public list (active only) / admin list (all when ?all=true). Optional ?location filter.
router.get("/menu-items", async (req, res): Promise<void> => {
  const wantAll = req.query.all === "true";
  const location = req.query.location as string | undefined;
  let rows = await db.select().from(menuItemsTable).orderBy(asc(menuItemsTable.displayOrder));
  if (wantAll) {
    const actor = await getActor(req.headers.authorization);
    if (actor.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  } else {
    rows = rows.filter(m => m.isActive);
  }
  if (location) rows = rows.filter(m => m.location === location || m.location === "both");
  res.json(rows.map(serialize));
});

router.post("/menu-items", async (req, res): Promise<void> => {
  const actor = await getActor(req.headers.authorization);
  if (actor.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const { label, url, location, displayOrder, openInNewTab, isActive = true } = req.body;
  if (!label || !url) { res.status(400).json({ error: "Label and URL required" }); return; }
  if (!isSafeUrl(url)) { res.status(400).json({ error: "URL must be an http(s) link or a relative path starting with /" }); return; }
  const [item] = await db.insert(menuItemsTable).values({
    label,
    url,
    location: normalizeLocation(location),
    displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
    openInNewTab: typeof openInNewTab === "boolean" ? openInNewTab : false,
    isActive,
  }).returning();
  await writeAudit(actor, "create", "menu_item", item.id, label);
  res.status(201).json(serialize(item));
});

router.patch("/menu-items/:id", async (req, res): Promise<void> => {
  const actor = await getActor(req.headers.authorization);
  if (actor.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { label, url, location, displayOrder, openInNewTab, isActive } = req.body;
  const updates: Record<string, unknown> = {};
  if (label !== undefined) updates.label = label;
  if (url !== undefined) {
    if (!isSafeUrl(url)) { res.status(400).json({ error: "URL must be an http(s) link or a relative path starting with /" }); return; }
    updates.url = url;
  }
  if (location !== undefined) updates.location = normalizeLocation(location);
  if (displayOrder !== undefined) updates.displayOrder = displayOrder;
  if (openInNewTab !== undefined) updates.openInNewTab = openInNewTab;
  if (isActive !== undefined) updates.isActive = isActive;
  const [item] = await db.update(menuItemsTable).set(updates).where(eq(menuItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  await writeAudit(actor, "update", "menu_item", id);
  res.json(serialize(item));
});

router.delete("/menu-items/:id", async (req, res): Promise<void> => {
  const actor = await getActor(req.headers.authorization);
  if (actor.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
  await writeAudit(actor, "delete", "menu_item", id);
  res.sendStatus(204);
});

export default router;
