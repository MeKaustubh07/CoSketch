"use client";

import type { ToolName } from "@/lib/types";

interface ToolbarProps {
  activeTool: ToolName;
  onToolChange: (tool: ToolName) => void;
}

interface ToolDef {
  name: ToolName;
  label: string;
  shortcut: string;
  icon: string;
}

const tools: ToolDef[] = [
  { name: "selection", label: "Select", shortcut: "V", icon: "↖" },
  { name: "rectangle", label: "Rectangle", shortcut: "R", icon: "▭" },
  { name: "diamond", label: "Diamond", shortcut: "D", icon: "◇" },
  { name: "ellipse", label: "Ellipse", shortcut: "O", icon: "○" },
  { name: "arrow", label: "Arrow", shortcut: "A", icon: "→" },
  { name: "line", label: "Line", shortcut: "L", icon: "╱" },
  { name: "draw", label: "Draw", shortcut: "P", icon: "✎" },
  { name: "text", label: "Text", shortcut: "T", icon: "T" },
  { name: "eraser", label: "Eraser", shortcut: "E", icon: "⌫" },
  { name: "pan", label: "Pan", shortcut: "H", icon: "✋" },
];

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl">
        {tools.map((tool) => (
          <button
            key={tool.name}
            onClick={() => onToolChange(tool.name)}
            title={`${tool.label} (${tool.shortcut})`}
            className={`
              relative flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium
              transition-all duration-150
              ${
                activeTool === tool.name
                  ? "bg-indigo-500/20 text-indigo-300 shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }
            `}
          >
            <span className="text-base">{tool.icon}</span>
            {activeTool === tool.name && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-indigo-400 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
