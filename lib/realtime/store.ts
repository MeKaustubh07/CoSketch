/**
 * store.ts — External store for real-time canvas state.
 *
 * Holds elements, elementOrder, and peer presence. Exposed via
 * useSyncExternalStore for zero-dep React integration.
 */

import type { CanvasElement } from "@/lib/types";
import type {
  InitMessage,
  OpBroadcast,
  PresenceData,
} from "../../server/protocol";

// ─── Peer info ────────────────────────────────────────────────────────────

export interface Peer {
  actorId: string;
  presence: PresenceData;
}

// ─── Store snapshot (immutable ref per change for useSyncExternalStore) ────

export interface StoreSnapshot {
  elements: Map<string, CanvasElement>;
  elementOrder: string[];
  self: { actorId: string; name: string; color: string } | null;
  others: Peer[];
  seq: number;
}

// ─── Store class ──────────────────────────────────────────────────────────

type Listener = () => void;

export class RealtimeStore {
  private elements = new Map<string, CanvasElement>();
  private elementOrder: string[] = [];
  private self: StoreSnapshot["self"] = null;
  private others = new Map<string, Peer>();
  private seq = 0;
  private listeners = new Set<Listener>();
  private snapshot: StoreSnapshot | null = null;

  // ─── React integration ────────────────────────────────────────────────

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): StoreSnapshot => {
    if (!this.snapshot) {
      this.snapshot = {
        elements: new Map(this.elements),
        elementOrder: [...this.elementOrder],
        self: this.self,
        others: Array.from(this.others.values()),
        seq: this.seq,
      };
    }
    return this.snapshot;
  };

  // For server-rendering (SSR)
  getServerSnapshot = (): StoreSnapshot => ({
    elements: new Map(),
    elementOrder: [],
    self: null,
    others: [],
    seq: 0,
  });

  // ─── Mutations ────────────────────────────────────────────────────────

  /** Handle the init message — full state replace. */
  setInit(msg: InitMessage): void {
    this.elements.clear();
    for (const [id, raw] of Object.entries(msg.elements)) {
      this.elements.set(id, raw as unknown as CanvasElement);
    }
    this.elementOrder = [...msg.elementOrder];
    this.self = msg.you;
    this.seq = msg.seq;

    this.others.clear();
    for (const peer of msg.others) {
      this.others.set(peer.actorId, peer);
    }

    this.notify();
  }

  /** Apply a remote op (from another client via server broadcast). */
  applyRemoteOp(msg: OpBroadcast): void {
    const { op } = msg;
    this.seq = msg.seq;

    if (op.op === "upsert") {
      this.elements.set(op.elementId, op.element as unknown as CanvasElement);
      if (!this.elementOrder.includes(op.elementId)) {
        this.elementOrder.push(op.elementId);
      }
    } else if (op.op === "delete") {
      this.elements.delete(op.elementId);
      this.elementOrder = this.elementOrder.filter((id) => id !== op.elementId);
    } else if (op.op === "reorder") {
      const idx = this.elementOrder.indexOf(op.elementId);
      if (idx !== -1) {
        const arr = [...this.elementOrder];
        arr.splice(idx, 1);
        let target: number;
        if (op.direction === "front") target = arr.length;
        else if (op.direction === "back") target = 0;
        else if (op.direction === "forward") target = Math.min(arr.length, idx + 1);
        else target = Math.max(0, idx - 1);
        arr.splice(target, 0, op.elementId);
        this.elementOrder = arr;
      }
    }

    this.notify();
  }

  /** Apply a local op optimistically (before server ack). */
  applyLocalOp(
    elementId: string,
    type: "upsert" | "delete",
    element?: CanvasElement
  ): void {
    if (type === "upsert" && element) {
      this.elements.set(elementId, element);
      if (!this.elementOrder.includes(elementId)) {
        this.elementOrder.push(elementId);
      }
    } else if (type === "delete") {
      this.elements.delete(elementId);
      this.elementOrder = this.elementOrder.filter((id) => id !== elementId);
    }

    this.notify();
  }

  /** Handle ack — no-op for now (op already applied optimistically). */
  handleAck(): void {
    // Could be used for pending-state UI indicators
  }

  /** Add a peer. */
  addPeer(actorId: string, presence: PresenceData): void {
    this.others.set(actorId, { actorId, presence });
    this.notify();
  }

  /** Remove a peer. */
  removePeer(actorId: string): void {
    this.others.delete(actorId);
    this.notify();
  }

  /** Update a peer's presence. */
  updatePeerPresence(actorId: string, presence: PresenceData): void {
    const peer = this.others.get(actorId);
    if (peer) {
      peer.presence = presence;
    } else {
      this.others.set(actorId, { actorId, presence });
    }
    this.notify();
  }

  /** Direct access for imperative code (rAF, event handlers). */
  getElements(): Map<string, CanvasElement> {
    return this.elements;
  }

  getElementOrder(): string[] {
    return this.elementOrder;
  }

  getElement(id: string): CanvasElement | undefined {
    return this.elements.get(id);
  }

  /** Remove elements by IDs (for delete tool). */
  removeElements(ids: string[]): void {
    for (const id of ids) this.elements.delete(id);
    const set = new Set(ids);
    this.elementOrder = this.elementOrder.filter((id) => !set.has(id));
    this.notify();
  }

  /** Batch update elements (for flush). */
  patchElements(patches: Array<[string, Partial<CanvasElement>]>): void {
    for (const [id, patch] of patches) {
      const el = this.elements.get(id);
      if (el) {
        this.elements.set(id, { ...el, ...patch } as CanvasElement);
      }
    }
    this.notify();
  }

  /** Reorder an element. */
  reorder(id: string, direction: "front" | "back" | "forward" | "backward"): void {
    const idx = this.elementOrder.indexOf(id);
    if (idx === -1) return;

    const arr = [...this.elementOrder];
    arr.splice(idx, 1);

    let target: number;
    if (direction === "front") target = arr.length;
    else if (direction === "back") target = 0;
    else if (direction === "forward") target = Math.min(arr.length, idx + 1);
    else target = Math.max(0, idx - 1);

    arr.splice(target, 0, id);
    this.elementOrder = arr;
    this.notify();
  }

  // ─── Internals ────────────────────────────────────────────────────────

  private notify(): void {
    this.snapshot = null; // Invalidate cached snapshot
    for (const listener of this.listeners) {
      listener();
    }
  }
}
