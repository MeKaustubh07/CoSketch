"use client";

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  const percentage = Math.round(zoom * 100);

  return (
    <div className="absolute bottom-4 right-4 z-40">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl">
        <button
          onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
          className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-all text-sm"
          title="Zoom out"
        >
          −
        </button>

        <button
          onClick={() => onZoomChange(1)}
          className="px-2 h-7 flex items-center justify-center text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-all min-w-[3rem]"
          title="Reset zoom to 100%"
        >
          {percentage}%
        </button>

        <button
          onClick={() => onZoomChange(Math.min(30, zoom + 0.1))}
          className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-all text-sm"
          title="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
