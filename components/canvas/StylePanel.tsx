"use client";

import type { AppState, FillStyle, StrokeStyle, FontFamily } from "@/lib/types";
import {
  STROKE_COLORS,
  BG_COLORS,
  STROKE_WIDTHS,
  ROUGHNESS_OPTIONS,
  FONT_SIZES,
} from "@/lib/types";

interface StylePanelProps {
  currentStyle: AppState["currentStyle"];
  activeTool: AppState["activeTool"];
  hasSelection: boolean;
  onStyleChange: (updates: Partial<AppState["currentStyle"]>) => void;
  onReorder: (direction: "front" | "back" | "forward" | "backward") => void;
}

export function StylePanel({
  currentStyle,
  activeTool,
  hasSelection,
  onStyleChange,
  onReorder,
}: StylePanelProps) {
  const showPanel = activeTool !== "selection" || hasSelection;

  if (!showPanel) return null;

  const isTextTool = activeTool === "text";
  const isLinearTool = activeTool === "arrow" || activeTool === "line";

  return (
    <div className="absolute top-20 left-4 z-40 w-52">
      <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl p-3 space-y-4">
        {/* Stroke Color */}
        <Section title="Stroke">
          <div className="flex flex-wrap gap-1.5">
            {STROKE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onStyleChange({ strokeColor: color })}
                className={`w-6 h-6 rounded-md border-2 transition-all ${
                  currentStyle.strokeColor === color
                    ? "border-indigo-400 scale-110"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </Section>

        {/* Background Color */}
        <Section title="Background">
          <div className="flex flex-wrap gap-1.5">
            {BG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onStyleChange({ backgroundColor: color })}
                className={`w-6 h-6 rounded-md border-2 transition-all ${
                  currentStyle.backgroundColor === color
                    ? "border-indigo-400 scale-110"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
                style={{
                  backgroundColor: color === "transparent" ? "transparent" : color,
                  backgroundImage:
                    color === "transparent"
                      ? "linear-gradient(45deg, #374151 25%, transparent 25%), linear-gradient(-45deg, #374151 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #374151 75%), linear-gradient(-45deg, transparent 75%, #374151 75%)"
                      : undefined,
                  backgroundSize: "6px 6px",
                  backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
                }}
              />
            ))}
          </div>
        </Section>

        {/* Fill Style (only when bg is not transparent) */}
        {currentStyle.backgroundColor !== "transparent" && (
          <Section title="Fill">
            <div className="flex gap-1">
              {(["hachure", "cross-hatch", "solid"] as FillStyle[]).map((fs) => (
                <button
                  key={fs}
                  onClick={() => onStyleChange({ fillStyle: fs })}
                  className={`px-2 py-1 text-xs rounded-md transition-all ${
                    currentStyle.fillStyle === fs
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  {fs}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Stroke Width */}
        <Section title="Stroke Width">
          <div className="flex gap-1">
            {STROKE_WIDTHS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onStyleChange({ strokeWidth: value })}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  currentStyle.strokeWidth === value
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* Stroke Style */}
        <Section title="Stroke Style">
          <div className="flex gap-1">
            {(["solid", "dashed", "dotted"] as StrokeStyle[]).map((ss) => (
              <button
                key={ss}
                onClick={() => onStyleChange({ strokeStyle: ss })}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  currentStyle.strokeStyle === ss
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {ss}
              </button>
            ))}
          </div>
        </Section>

        {/* Roughness */}
        <Section title="Sloppiness">
          <div className="flex gap-1">
            {ROUGHNESS_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onStyleChange({ roughness: value })}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  currentStyle.roughness === value
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* Edges (for rect/diamond) */}
        {(activeTool === "rectangle" || activeTool === "diamond") && (
          <Section title="Edges">
            <div className="flex gap-1">
              <button
                onClick={() => onStyleChange({ roundness: 0 })}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  currentStyle.roundness === 0
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                Sharp
              </button>
              <button
                onClick={() => onStyleChange({ roundness: 12 })}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  currentStyle.roundness > 0
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                Round
              </button>
            </div>
          </Section>
        )}

        {/* Opacity */}
        <Section title={`Opacity: ${currentStyle.opacity}%`}>
          <input
            type="range"
            min={10}
            max={100}
            value={currentStyle.opacity}
            onChange={(e) =>
              onStyleChange({ opacity: parseInt(e.target.value, 10) })
            }
            className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
          />
        </Section>

        {/* Font options (text tool) */}
        {isTextTool && (
          <>
            <Section title="Font">
              <div className="flex gap-1">
                {(["hand", "normal", "code"] as FontFamily[]).map((ff) => (
                  <button
                    key={ff}
                    onClick={() => onStyleChange({ fontFamily: ff })}
                    className={`px-2 py-1 text-xs rounded-md transition-all ${
                      currentStyle.fontFamily === ff
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                  >
                    {ff}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Size">
              <div className="flex gap-1">
                {FONT_SIZES.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => onStyleChange({ fontSize: value })}
                    className={`px-2 py-1 text-xs rounded-md transition-all ${
                      currentStyle.fontSize === value
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Arrowheads (line/arrow tool) */}
        {isLinearTool && (
          <Section title="Arrowheads">
            <div className="flex gap-1">
              {(["none", "arrow", "bar", "dot"] as const).map((ah) => (
                <button
                  key={ah}
                  onClick={() => onStyleChange({ endArrowhead: ah })}
                  className={`px-2 py-1 text-xs rounded-md transition-all ${
                    currentStyle.endArrowhead === ah
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  {ah}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Layer controls */}
        {hasSelection && (
          <Section title="Layer">
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => onReorder("front")}
                className="px-1 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-all"
                title="Bring to front"
              >
                ⤒
              </button>
              <button
                onClick={() => onReorder("forward")}
                className="px-1 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-all"
                title="Bring forward"
              >
                ↑
              </button>
              <button
                onClick={() => onReorder("backward")}
                className="px-1 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-all"
                title="Send backward"
              >
                ↓
              </button>
              <button
                onClick={() => onReorder("back")}
                className="px-1 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-all"
                title="Send to back"
              >
                ⤓
              </button>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">{title}</div>
      {children}
    </div>
  );
}
