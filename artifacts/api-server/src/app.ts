import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Standard security headers (X-Content-Type-Options, X-Frame-Options, etc.).
// CSP is left to the default (off for API-only responses) since this process
// also serves the built SPA in production and a strict default-src would
// break Vite-built asset loading without careful per-app tuning.
app.use(helmet({ contentSecurityPolicy: false }));

// Restrict cross-origin API access to known frontend origins instead of the
// wide-open default (cors() with no options reflects any Origin). APP_URL is
// the canonical production/public origin; REPLIT_DOMAINS covers the
// workspace dev preview and any other Replit-issued domains for this repl.
export const allowedOrigins = new Set(
  [process.env.APP_URL, ...(process.env.REPLIT_DOMAINS?.split(",") ?? [])]
    .filter((o): o is string => Boolean(o))
    .map((o) => (o.startsWith("http") ? o : `https://${o}`)),
);
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (server-to-server calls, curl, payment gateway
      // callbacks) — allow, since CORS only governs browser requests.
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

// Centralised JSON error handler.
// Express 5 automatically forwards async route errors here, so any unhandled
// throw in a route handler (e.g. a DB query failing) reaches this middleware
// and returns a clean JSON response instead of the default HTML 500 page.
// Without this, the frontend's `await res.json()` throws a SyntaxError on the
// HTML body and the user sees a cryptic "Unexpected token '<'" failure.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof Error && err.message === "Not allowed by CORS") {
      res.status(403).json({ error: "Not allowed by CORS" });
      return;
    }
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : String(err);
    logger.error({ err }, "Unhandled route error");
    res.status(500).json({ error: message });
  },
);

// Serve the built rxmanager frontend whenever the dist directory is present.
// This covers production (where the build step always produces it) and any
// local "build then start" workflows. The check is intentionally based on
// whether the built files exist — not on NODE_ENV — so it works even when
// NODE_ENV is overridden by a parent environment variable.
const publicDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "rxmanager",
  "dist",
  "public",
);

const indexHtml = path.join(publicDir, "index.html");
if (fs.existsSync(indexHtml)) {
  app.use(express.static(publicDir));

  // SPA fallback: any non-API GET request falls through to index.html so
  // client-side routing (e.g. /doctor/prescriptions/new) works on refresh.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(indexHtml);
  });
} else {
  // Fallback when the frontend has not been built yet (e.g. first cold start
  // before the build step runs, or a mismatched container path). This
  // guarantees the Autoscale startup health probe on GET / always receives
  // HTTP 200 so the deployment promote step can succeed.
  app.get("/", (_req, res) => {
    res.status(200).send("QRX API is running.");
  });
}

export default app;
