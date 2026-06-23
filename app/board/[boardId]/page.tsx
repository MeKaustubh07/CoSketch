"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CanvasStage } from "@/components/canvas/CanvasStage";
import { SharePanel } from "@/components/collab/SharePanel";

export default function BoardPage() {
  const params = useParams();
  const boardId = params.boardId as string;
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="w-screen h-screen relative">
      <CanvasStage />

      {/* Share button */}
      <button
        onClick={() => setShareOpen(true)}
        className="absolute top-4 right-4 z-40 flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium rounded-lg hover:bg-indigo-500/30 transition-all backdrop-blur-sm"
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

      {/* Share panel */}
      <SharePanel
        boardId={boardId}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
