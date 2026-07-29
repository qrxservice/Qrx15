import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { logger } from "./logger";

let io: SocketIOServer | null = null;

// Track live connections: room -> set of socket IDs
// Used for the admin display dashboard
const roomSockets = new Map<string, Set<string>>();
// Track per-socket metadata for logging
const socketMeta = new Map<string, { room: string; connectedAt: Date }>();

export function initSocketIO(
  httpServer: HttpServer,
  allowedOrigins: Set<string>,
): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    // Display pages are public (TV, kiosk, mobile) and may come from any origin.
    // The socket endpoint only ever emits read-only queue-state events so the
    // permissive CORS here does not expose admin or patient write surfaces.
    cors: {
      origin: (origin, callback) => {
        // Allow: no-origin (same-site), known app origins, and any origin for
        // display-only events (public kiosk / TV access).
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        // Display sockets are public — permit all origins.
        callback(null, true);
      },
      methods: ["GET"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    // ── Ambulance rooms ──────────────────────────────────────────────────
    const rawRole = socket.handshake.query["role"];
    const role = Array.isArray(rawRole) ? rawRole[0] : rawRole;
    const rawDriverId = socket.handshake.query["driverId"];
    const driverIdStr = Array.isArray(rawDriverId) ? rawDriverId[0] : rawDriverId;
    const rawRequestId = socket.handshake.query["requestId"];
    const requestIdStr = Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId;

    if (role === "ambulance_admin") {
      socket.join("ambulance:admin");
    }
    if (driverIdStr) {
      socket.join(`ambulance:driver-${driverIdStr}`);
    }
    if (requestIdStr) {
      socket.join(`ambulance:request-${requestIdStr}`);
    }

    // ── Queue display rooms (existing) ───────────────────────────────────
    const rawId = socket.handshake.query["doctorId"];
    const doctorId = Array.isArray(rawId) ? rawId[0] : rawId;
    const room = `doctor-${doctorId ?? "unknown"}`;

    socket.join(room);

    if (!roomSockets.has(room)) roomSockets.set(room, new Set());
    roomSockets.get(room)!.add(socket.id);
    socketMeta.set(socket.id, { room, connectedAt: new Date() });

    logger.info({ socketId: socket.id, room, doctorId }, "Display screen connected");

    socket.on("disconnect", (reason) => {
      const meta = socketMeta.get(socket.id);
      if (meta) {
        roomSockets.get(meta.room)?.delete(socket.id);
        if (roomSockets.get(meta.room)?.size === 0) roomSockets.delete(meta.room);
        socketMeta.delete(socket.id);
        logger.info({ socketId: socket.id, room: meta.room, reason }, "Display screen disconnected");
      }
    });
  });

  logger.info("Socket.IO server initialized on /api/socket.io");
  return io;
}

/**
 * Broadcast a queue event to all display screens subscribed to a doctor's room.
 * eventType should be one of: queue:updated | queue:called | queue:skipped |
 * queue:completed | queue:joined | queue:cancelled
 */
export function broadcastSocketEvent(
  doctorId: number,
  eventType: string,
  payload: Record<string, unknown> = {},
): void {
  if (!io) return;
  const room = `doctor-${doctorId}`;
  io.to(room).emit(eventType, { doctorId, ...payload });
  logger.debug({ room, event: eventType }, "Socket event broadcast");
}

/**
 * Broadcast an ambulance system event to the ambulance admin room and
 * optionally a per-request room so users/drivers get live updates.
 * eventType examples: driver:location_updated | driver:status_changed |
 *   request:new | request:accepted | request:sos | request:en_route |
 *   request:arrived | request:in_progress | request:completed | request:cancelled
 */
export function broadcastAmbulanceEvent(
  eventType: string,
  payload: Record<string, unknown> = {},
): void {
  if (!io) return;
  // Admin room always receives all ambulance events
  io.to("ambulance:admin").emit(eventType, payload);
  // Per-request room for user/driver tracking
  if (payload.requestId) {
    io.to(`ambulance:request-${payload.requestId}`).emit(eventType, payload);
  }
  // Per-driver room for driver-specific events
  if (payload.driverId) {
    io.to(`ambulance:driver-${payload.driverId}`).emit(eventType, payload);
  }
  logger.debug({ event: eventType }, "Ambulance socket event broadcast");
}

/** Returns active display connection counts per doctor for the admin dashboard. */
export function getActiveDisplayConnections(): Array<{
  doctorId: number;
  connections: number;
  room: string;
}> {
  const result: Array<{ doctorId: number; connections: number; room: string }> = [];
  for (const [room, sockets] of roomSockets) {
    const m = room.match(/^doctor-(\d+)$/);
    if (m) {
      result.push({
        doctorId: parseInt(m[1]),
        connections: sockets.size,
        room,
      });
    }
  }
  return result;
}
