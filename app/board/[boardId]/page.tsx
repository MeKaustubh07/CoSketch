import { CanvasStage } from "@/components/canvas/CanvasStage";

export default function BoardPage() {
  // Phase 3: Local-only canvas — no auth or Liveblocks integration yet
  // Phase 4 will wrap this in RoomProvider and add session checks
  return (
    <div className="w-screen h-screen">
      <CanvasStage />
    </div>
  );
}
