import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

function getSocketUrl(): string {
  const proto = window.location.protocol;
  return `${proto}//${window.location.host}`;
}

export type QueueEvent =
  | "queue:updated"
  | "queue:called"
  | "queue:completed"
  | "queue:skipped"
  | "queue:joined"
  | "queue:cancelled";

export interface DisplaySocketCallbacks {
  /** Fired on any queue state change — always refetch data */
  onUpdate?: () => void;
  /** Fired specifically when a patient is called (good time to voice-announce) */
  onCalled?: (data: { doctorId: number }) => void;
  /** Fired when connected/reconnected */
  onConnect?: () => void;
  /** Fired when disconnected */
  onDisconnect?: () => void;
}

/**
 * Maintains a Socket.IO connection to the QRX queue display channel.
 * Joins the doctor's room and calls the appropriate callback for each event.
 * Auto-reconnects on disconnect — no manual refresh needed.
 */
export function useDisplaySocket(
  doctorId: number | null,
  callbacks: DisplaySocketCallbacks,
): void {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const connect = useCallback(() => {
    if (doctorId === null || doctorId === 0) return undefined;

    const socket: Socket = io(getSocketUrl(), {
      path: "/api/socket.io",
      query: { doctorId: String(doctorId) },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socket.on("connect", () => {
      cbRef.current.onConnect?.();
    });

    socket.on("disconnect", () => {
      cbRef.current.onDisconnect?.();
    });

    // Handle all queue events: any of them means the display should refresh
    const QUEUE_EVENTS: QueueEvent[] = [
      "queue:updated",
      "queue:called",
      "queue:completed",
      "queue:skipped",
      "queue:joined",
      "queue:cancelled",
    ];

    for (const event of QUEUE_EVENTS) {
      socket.on(event, (data: { doctorId: number }) => {
        cbRef.current.onUpdate?.();
        if (event === "queue:called") {
          cbRef.current.onCalled?.(data);
        }
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [doctorId]);

  useEffect(() => {
    return connect() ?? undefined;
  }, [connect]);
}
