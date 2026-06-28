/**
 * provider.tsx — RealtimeProvider: React context that owns the WebSocket
 * lifecycle and the realtime store.
 *
 * Replaces RoomProviderWrapper + LiveblocksProvider.
 */

/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { RealtimeSocket, type ConnectionState } from "./socket";
import { RealtimeStore, type StoreSnapshot, type Peer } from "./store";
import type { CanvasElement } from "@/lib/types";
import type { UpsertOp, DeleteOp, PresenceData } from "../../server/protocol";
import { nanoid } from "nanoid";

// ─── Context ──────────────────────────────────────────────────────────────

interface RealtimeContextValue {
  store: RealtimeStore;
  socket: RealtimeSocket | null;
  connectionState: ConnectionState;
  // Convenience actions
  sendUpsert: (element: CanvasElement) => void;
  sendDelete: (elementId: string) => void;
  sendReorder: (elementId: string, direction: "front" | "back" | "forward" | "backward") => void;
  sendPresence: (presence: PresenceData) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// ─── Hooks ────────────────────────────────────────────────────────────────

export function useRealtimeStore(): StoreSnapshot {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtimeStore must be inside RealtimeProvider");
  return useSyncExternalStore(
    ctx.store.subscribe,
    ctx.store.getSnapshot,
    ctx.store.getServerSnapshot
  );
}

export function useRealtimeActions() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtimeActions must be inside RealtimeProvider");
  return {
    store: ctx.store,
    sendUpsert: ctx.sendUpsert,
    sendDelete: ctx.sendDelete,
    sendReorder: ctx.sendReorder,
    sendPresence: ctx.sendPresence,
    connectionState: ctx.connectionState,
  };
}

export function useOtherUsers(): Peer[] {
  const snap = useRealtimeStore();
  return snap.others;
}

export function useSelfUser(): StoreSnapshot["self"] {
  const snap = useRealtimeStore();
  return snap.self;
}

// ─── Provider ─────────────────────────────────────────────────────────────

interface RealtimeProviderProps {
  roomId: string;
  userName: string;
  children: ReactNode;
  onAuthFailed?: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

export function RealtimeProvider({
  roomId,
  userName,
  children,
  onAuthFailed,
}: RealtimeProviderProps) {
  const [store] = useState(() => new RealtimeStore());
  const [socket, setSocket] = useState<RealtimeSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = new RealtimeSocket({
      roomId,
      userName,
      wsUrl: WS_URL,
      onInit: (msg) => {
        store.setInit(msg);
        setReady(true);
      },
      onOp: (msg) => {
        store.applyRemoteOp(msg);
      },
      onAck: () => {
        store.handleAck();
      },
      onPresence: (msg) => {
        store.updatePeerPresence(msg.actorId, msg.presence);
      },
      onPeerJoin: (msg) => {
        store.addPeer(msg.actorId, msg.presence);
      },
      onPeerLeave: (msg) => {
        store.removePeer(msg.actorId);
      },
      onConnectionChange: (state) => {
        setConnectionState(state);
      },
      onAuthFailed: () => {
        onAuthFailed?.();
      },
    });

    setSocket(s);
    s.connect();

    return () => {
      s.destroy();
      setSocket(null);
    };
  }, [roomId, userName, onAuthFailed, store]);

  const sendUpsert = (element: CanvasElement): void => {
    const op: UpsertOp = {
      op: "upsert",
      opId: nanoid(10),
      elementId: element.id,
      element: element as unknown as Record<string, unknown>,
      version: element.version,
    };
    store.applyLocalOp(element.id, "upsert", element);
    socket?.sendOp(op);
  };

  const sendDelete = (elementId: string): void => {
    const op: DeleteOp = {
      op: "delete",
      opId: nanoid(10),
      elementId,
      version: Date.now(), // High version ensures acceptance
    };
    store.applyLocalOp(elementId, "delete");
    socket?.sendOp(op);
  };

  const sendReorder = (elementId: string, direction: "front" | "back" | "forward" | "backward"): void => {
    const op: import("../../server/protocol").ReorderOp = {
      op: "reorder",
      opId: nanoid(10),
      elementId,
      direction,
    };
    store.reorder(elementId, direction);
    socket?.sendOp(op);
  };

  const sendPresence = (presence: PresenceData): void => {
    socket?.sendPresence(presence);
  };

  const value: RealtimeContextValue = {
    store: store,
    socket: socket,
    connectionState,
    sendUpsert,
    sendDelete,
    sendReorder,
    sendPresence,
  };

  if (!ready) {
    return <BoardLoader connectionState={connectionState} />;
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────

function BoardLoader({ connectionState }: { connectionState?: ConnectionState }) {
  const [showSlow, setShowSlow] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (connectionState !== "error" && connectionState !== "disconnected") {
      t = setTimeout(() => setShowSlow(true), 4000);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [connectionState]);

  const isError = connectionState === "error" || connectionState === "disconnected";

  return (
    <div
      className="flex items-center justify-center w-screen h-screen bg-[#fafafa]"
      style={{
        backgroundImage: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isError ? "#ef4444" : "#6965db"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={!isError ? "animate-pulse" : ""}
        >
          {isError ? (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </>
          ) : (
            <>
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </>
          )}
        </svg>

        {isError ? (
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">Connection Error</h3>
            <p className="text-sm text-gray-500">
              Could not connect to the real-time server. It may be down or your network is offline.
            </p>
            <p className="text-xs text-gray-400 mt-2">Retrying automatically in the background...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#6965db] border-t-transparent rounded-full animate-spin" />
              <span
                className="text-2xl text-[#6965db]"
                style={{ fontFamily: "var(--font-caveat), cursive" }}
              >
                CoSketch
              </span>
            </div>
            <p className="text-sm text-gray-400">
              {showSlow ? "Still connecting... server might be asleep" : "Connecting to room…"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
