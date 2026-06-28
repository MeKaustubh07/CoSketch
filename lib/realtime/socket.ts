/**
 * socket.ts — WebSocket connection manager for CoSketch client.
 *
 * Handles: ticket fetch → connect, exponential-backoff reconnect,
 * op outbox (resend unacked on reconnect), dedup, ping/pong.
 */

import type {
  ClientMessage,
  ServerMessage,
  Op,
  PresenceData,
} from "../../server/protocol";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export interface RealtimeSocketOptions {
  roomId: string;
  userName: string;
  wsUrl: string; // e.g. ws://localhost:8080
  onInit: (msg: Extract<ServerMessage, { type: "init" }>) => void;
  onOp: (msg: Extract<ServerMessage, { type: "op" }>) => void;
  onAck: (msg: Extract<ServerMessage, { type: "ack" }>) => void;
  onPresence: (msg: Extract<ServerMessage, { type: "presence" }>) => void;
  onPeerJoin: (msg: Extract<ServerMessage, { type: "peer-join" }>) => void;
  onPeerLeave: (msg: Extract<ServerMessage, { type: "peer-leave" }>) => void;
  onConnectionChange: (state: ConnectionState) => void;
  onAuthFailed: () => void;
}

export class RealtimeSocket {
  private ws: WebSocket | null = null;
  private opts: RealtimeSocketOptions;
  private outbox = new Map<string, string>(); // opId → serialized ClientOpMessage
  private ackedOps = new Set<string>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private _state: ConnectionState = "disconnected";

  constructor(opts: RealtimeSocketOptions) {
    this.opts = opts;
  }

  get state(): ConnectionState {
    return this._state;
  }

  /** Start the connection. Fetches a ticket, then opens the WebSocket. */
  async connect(): Promise<void> {
    if (this.destroyed) return;
    this.setState("connecting");

    try {
      // Fetch short-lived ticket from the Next.js API
      const res = await fetch(`/api/ws-ticket?room=${this.opts.roomId}`);
      if (res.status === 401) {
        this.opts.onAuthFailed();
        return;
      }
      if (!res.ok) {
        throw new Error(`Ticket fetch failed: ${res.status}`);
      }
      const { ticket } = await res.json();

      if (this.destroyed) return;

      // Open WebSocket (name is display-only — used for presence at join)
      const url =
        `${this.opts.wsUrl}?room=${this.opts.roomId}&ticket=${ticket}` +
        `&name=${encodeURIComponent(this.opts.userName || "Guest")}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.setState("connected");
        this.startPing();

        // Resend unacked ops from the outbox
        for (const serialized of this.outbox.values()) {
          this.ws?.send(serialized);
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data as string);
      };

      this.ws.onclose = (event) => {
        this.stopPing();

        if (event.code === 4401) {
          // Bad/expired ticket — re-auth needed
          this.opts.onAuthFailed();
          return;
        }

        if (!this.destroyed) {
          this.setState("disconnected");
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose will fire after this
      };
    } catch (err) {
      console.error("[ws-client] connect error:", err);
      if (!this.destroyed) {
        this.setState("error");
        this.scheduleReconnect();
      }
    }
  }

  /** Send an op. Adds to outbox until acked. */
  sendOp(op: Op): void {
    const msg: ClientMessage = { type: "op", op };
    const serialized = JSON.stringify(msg);
    this.outbox.set(op.opId, serialized);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(serialized);
    }
  }

  /** Send presence update (fire-and-forget). */
  sendPresence(presence: PresenceData): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const msg: ClientMessage = { type: "presence", presence };
    this.ws.send(JSON.stringify(msg));
  }

  /** Tear down the connection permanently. */
  destroy(): void {
    this.destroyed = true;
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.outbox.clear();
    this.ackedOps.clear();
  }

  // ─── Internals ──────────────────────────────────────────────────────────

  private handleMessage(raw: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "init":
        this.opts.onInit(msg);
        break;
      case "op":
        this.opts.onOp(msg);
        break;
      case "ack":
        // Remove from outbox — no need to resend
        this.outbox.delete(msg.opId);
        this.ackedOps.add(msg.opId);
        this.opts.onAck(msg);
        break;
      case "presence":
        this.opts.onPresence(msg);
        break;
      case "peer-join":
        this.opts.onPeerJoin(msg);
        break;
      case "peer-leave":
        this.opts.onPeerLeave(msg);
        break;
      case "pong":
        // Heartbeat response — no action needed
        break;
    }
  }

  private setState(state: ConnectionState): void {
    this._state = state;
    this.opts.onConnectionChange(state);
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    const backoff = Math.min(30_000, 1000 * Math.pow(2, this.reconnectAttempt));
    this.reconnectAttempt++;
    console.log(`[ws-client] reconnecting in ${backoff}ms (attempt ${this.reconnectAttempt})`);
    this.reconnectTimer = setTimeout(() => this.connect(), backoff);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 25_000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}
