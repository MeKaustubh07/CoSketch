"use client";

import { memo } from "react";

interface ExportMenuProps {
  onExportPNG: () => void;
}

export const ExportMenu = memo(function ExportMenu({ onExportPNG }: ExportMenuProps) {
  return (
    <div className="absolute bottom-16 right-3 z-40">
      <button
        onClick={onExportPNG}
        className="island flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-800 transition-colors text-sm"
        title="Export as PNG"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export PNG
      </button>
    </div>
  );
});
