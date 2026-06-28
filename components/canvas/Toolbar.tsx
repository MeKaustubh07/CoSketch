"use client";

import { memo } from "react";
import type { ToolName } from "@/lib/types";

interface ToolbarProps {
  activeTool: ToolName;
  onToolChange: (tool: ToolName) => void;
}

interface ToolDef {
  name: ToolName;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

// Excalidraw-style SVG icons
const tools: ToolDef[] = [
  {
    name: "pan",
    label: "Hand (Panning)",
    shortcut: "H",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8" />
        <path d="M18 11a2 2 0 0 1 4 0v5a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6.1-2.7L3.7 18a2 2 0 0 1 2.7-2.7L8 17" />
      </svg>
    ),
  },
  {
    name: "selection",
    label: "Selection",
    shortcut: "V",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 3l14 8.5L12 14l-2.5 7.5L5 3z" />
      </svg>
    ),
  },
  {
    name: "rectangle",
    label: "Rectangle",
    shortcut: "R",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
  },
  {
    name: "diamond",
    label: "Diamond",
    shortcut: "D",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l10 10-10 10L2 12z" />
      </svg>
    ),
  },
  {
    name: "ellipse",
    label: "Ellipse",
    shortcut: "O",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="12" cy="12" rx="10" ry="10" />
      </svg>
    ),
  },
  {
    name: "arrow",
    label: "Arrow",
    shortcut: "A",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="19" x2="19" y2="5" />
        <polyline points="10 5 19 5 19 14" />
      </svg>
    ),
  },
  {
    name: "line",
    label: "Line",
    shortcut: "L",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="4" y1="20" x2="20" y2="4" />
      </svg>
    ),
  },
  {
    name: "draw",
    label: "Draw",
    shortcut: "P",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    name: "text",
    label: "Text",
    shortcut: "T",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9.5" y1="20" x2="14.5" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    name: "eraser",
    label: "Eraser",
    shortcut: "E",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20H7L3 16l9-9 8 8-4 5z" />
        <line x1="6" y1="11" x2="13" y2="18" />
      </svg>
    ),
  },
];

export const Toolbar = memo(function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
      <div className="island flex items-center gap-0.5 px-1.5 py-1">
        {tools.map((tool) => (
          <button
            key={tool.name}
            onClick={() => onToolChange(tool.name)}
            title={`${tool.label} — ${tool.shortcut}`}
            className={`
              relative flex items-center justify-center w-9 h-9 rounded-lg
              transition-colors duration-100
              ${
                activeTool === tool.name
                  ? "bg-[#e0dfff] text-[#6965db]"
                  : "text-[#1b1b1f] hover:bg-[#f1f0ff]"
              }
            `}
          >
            {tool.icon}
          </button>
        ))}
      </div>
    </div>
  );
});
