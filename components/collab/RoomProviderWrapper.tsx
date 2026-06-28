"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveMap, LiveList } from "@liveblocks/client";

interface RoomProviderWrapperProps {
  roomId: string;
  userName: string;
  password: string;
  children: ReactNode;
}

export function RoomProviderWrapper({
  roomId,
  userName,
  password,
  children,
}: RoomProviderWrapperProps) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        const res = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, name: userName, password }),
        });
        return await res.json();
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{
          cursor: null,
          selectedIds: [],
          activeTool: "selection",
          isTyping: false,
        }}
        initialStorage={{
          shapes: new LiveMap(),
          elementOrder: new LiveList([]),
        }}
      >
        <ClientSideSuspense fallback={<BoardLoader />}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function BoardLoader() {
  return (
    <div
      className="flex items-center justify-center w-screen h-screen bg-[#fafafa]"
      style={{
        backgroundImage: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6965db"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-pulse"
        >
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#6965db] border-t-transparent rounded-full animate-spin" />
          <span
            className="text-2xl text-[#6965db]"
            style={{ fontFamily: "var(--font-caveat), cursive" }}
          >
            CoSketch
          </span>
        </div>
        <p className="text-sm text-gray-400">Setting up your canvas…</p>
      </div>
    </div>
  );
}
