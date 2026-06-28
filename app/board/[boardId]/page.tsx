"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CanvasStage } from "@/components/canvas/CanvasStage";
import { SharePanel } from "@/components/collab/SharePanel";
import { RoomProviderWrapper } from "@/components/collab/RoomProviderWrapper";
import { AvatarStack } from "@/components/collab/Cursors";

export default function BoardPage() {
  const params = useParams();
  const boardId = params.boardId as string;

  return (
    <RoomProviderWrapper roomId={boardId}>
      <BoardRoom boardId={boardId} />
    </RoomProviderWrapper>
  );
}

function BoardRoom({ boardId }: { boardId: string }) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="w-screen h-screen relative bg-white overflow-hidden">
      <CanvasStage />

      {/* Top-right cluster: avatars + share */}
      <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
        <AvatarStack />
        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white bg-[#6965db] hover:bg-[#5b57d1] shadow-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
      </div>

      <SharePanel boardId={boardId} isOpen={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
