import type { ToolName } from "@/lib/types";

/**
 * Liveblocks requires storage values to satisfy LsonObject (index-signatured).
 * TypeScript interfaces don't have index signatures, so we use a plain
 * Record type for the LiveMap value and cast to CanvasElement when reading.
 */

// JSON-serializable shape record (satisfies Lson)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeRecord = Record<string, any>;

// Global Liveblocks type declarations
declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      selectedIds: string[];
      activeTool: ToolName;
      isTyping: boolean;
    };
    Storage: {
      shapes: LiveMap<string, LiveObject<ShapeRecord>>;
      elementOrder: LiveList<string>;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar?: string;
      };
    };
    RoomEvent: Record<string, never>;
    ThreadMetadata: Record<string, never>;
    RoomInfo: Record<string, never>;
  }
}

// Re-export Liveblocks types used in Storage declaration
import type { LiveMap, LiveObject, LiveList } from "@liveblocks/client";
// These imports are used only in the `declare global` block above.
// TypeScript needs them in scope for the ambient declaration to resolve.
export type { LiveMap, LiveObject, LiveList };
