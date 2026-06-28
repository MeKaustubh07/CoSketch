"use client";

import { useOtherUsers, useSelfUser } from "@/lib/realtime/provider";

/**
 * Inline avatar cluster shown in the board's top bar.
 * Live pointer cursors are rendered inside CanvasStage (it owns the viewport).
 */
export function AvatarStack() {
  const self = useSelfUser();
  const others = useOtherUsers();

  const users = [
    ...(self ? [{ id: self.actorId, name: self.name, color: self.color, isSelf: true }] : []),
    ...others.map((o) => ({ id: o.actorId, name: o.presence.name, color: o.presence.color, isSelf: false })),
  ];

  if (users.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2">
      {users.slice(0, 5).map((user, i) => (
        <div
          key={user.id ?? i}
          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: user.color || "#6965db" }}
          title={`${user.name || "Guest"}${user.isSelf ? " (you)" : ""}`}
        >
          {user.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
      ))}
      {users.length > 5 && (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs font-medium text-white shadow-sm">
          +{users.length - 5}
        </div>
      )}
    </div>
  );
}
