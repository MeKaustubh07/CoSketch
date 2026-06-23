"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";

export function Cursors() {
  const others = useOthers();

  return (
    <>
      {others.map(({ connectionId, presence, info }) => {
        if (!presence.cursor) return null;

        return (
          <div
            key={connectionId}
            className="pointer-events-none absolute z-50 transition-transform duration-75"
            style={{
              transform: `translate(${presence.cursor.x}px, ${presence.cursor.y}px)`,
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="24"
              height="36"
              viewBox="0 0 24 36"
              fill="none"
              className="drop-shadow-md"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={info.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>

            {/* Name label */}
            <div
              className="absolute left-5 top-4 px-2 py-0.5 rounded-md text-xs text-white font-medium whitespace-nowrap shadow-lg"
              style={{ backgroundColor: info.color }}
            >
              {info.name}
            </div>
          </div>
        );
      })}
    </>
  );
}

export function AvatarStack() {
  const self = useSelf();
  const others = useOthers();

  const users = [
    { id: self.id, info: self.info, isSelf: true },
    ...others.map((o) => ({ id: o.id, info: o.info, isSelf: false })),
  ];

  return (
    <div className="absolute top-4 right-4 z-40">
      <div className="flex items-center -space-x-2">
        {users.slice(0, 5).map((user, i) => (
          <div
            key={user.id ?? i}
            className="w-8 h-8 rounded-full border-2 border-zinc-900 flex items-center justify-center text-xs font-bold text-white shadow-md"
            style={{ backgroundColor: user.info.color }}
            title={`${user.info.name}${user.isSelf ? " (you)" : ""}`}
          >
            {user.info.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        ))}
        {users.length > 5 && (
          <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
            +{users.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}
