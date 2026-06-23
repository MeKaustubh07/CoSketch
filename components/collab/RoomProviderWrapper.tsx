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
  children: ReactNode;
}

export function RoomProviderWrapper({
  roomId,
  children,
}: RoomProviderWrapperProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
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
        <ClientSideSuspense
          fallback={
            <div className="flex items-center justify-center w-screen h-screen bg-zinc-950">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm">Loading board…</p>
              </div>
            </div>
          }
        >
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
