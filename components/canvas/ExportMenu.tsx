"use client";

import { useState, useRef, useEffect } from "react";

interface ExportMenuProps {
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
}

export function ExportMenu({ onExportPNG, onExportJSON, onImportJSON }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="absolute bottom-4 left-4 z-40" ref={menuRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all text-sm shadow-2xl"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Export
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 w-48 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={() => { onExportPNG(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-base">🖼️</span>
            Export as PNG
          </button>
          <button
            onClick={() => { onExportJSON(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-base">📄</span>
            Export as JSON
          </button>
          <div className="border-t border-zinc-800" />
          <button
            onClick={() => { fileInputRef.current?.click(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-base">📥</span>
            Import from JSON
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".cosketch,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onImportJSON(file);
            setOpen(false);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
