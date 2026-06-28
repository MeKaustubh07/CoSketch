"use client";

import { memo } from "react";

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export const ZoomControls = memo(function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  const percentage = Math.round(zoom * 100);

  return (
    <div className="absolute bottom-3 left-3 z-40">
      <div className="island flex items-center gap-0.5 px-1 py-0.5">
        <button
          onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          title="Zoom out"
        >
          −
        </button>

        <button
          onClick={() => onZoomChange(1)}
          className="px-2 h-8 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors min-w-[3rem]"
          title="Reset zoom to 100%"
        >
          {percentage}%
        </button>

        <button
          onClick={() => onZoomChange(Math.min(30, zoom + 0.1))}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          title="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
});
