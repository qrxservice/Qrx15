import { useEffect, useRef, useCallback } from "react";

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ws`;
}

/**
 * Subscribes to real-time queue updates over WebSocket.
 *
 * @param doctorId  Doctor to subscribe to. Pass 0 to receive updates for ALL
 *                  doctors (used by the patient tracker). Pass null to skip
 *                  connecting entirely.
 * @param onUpdate  Callback fired whenever the server pushes a queue-update event.
 */
export function useQueueWebSocket(
  doctorId: number | null,
  onUpdate: () => void,
): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const connect = useCallback(() => {
    if (doctorId === null) return undefined;

    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let destroyed = false;

    const open = () => {
      ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "subscribe", doctorId }));
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as unknown;
          if (
            msg !== null &&
            typeof msg === "object" &&
            "type" in msg &&
            (msg as Record<string, unknown>)["type"] === "queue-update"
          ) {
            onUpdateRef.current();
          }
        } catch {
        }
      };

      ws.onclose = () => {
        if (!destroyed) {
          reconnectTimer = setTimeout(open, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    open();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [doctorId]);

  useEffect(() => {
    return connect() ?? undefined;
  }, [connect]);
}
