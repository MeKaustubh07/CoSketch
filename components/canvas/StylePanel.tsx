"use client";

import { memo } from "react";
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
  showText?: boolean;
  showArrowheads?: boolean;
  onStyleChange: (updates: Partial<AppState["currentStyle"]>) => void;
  onReorder: (direction: "front" | "back" | "forward" | "backward") => void;
}

export const StylePanel = memo(function StylePanel({
  currentStyle,
  activeTool,
  hasSelection,
  showText = false,
  showArrowheads = false,
  onStyleChange,
  onReorder,
}: StylePanelProps) {
  return (
    <StylePanelInner
      currentStyle={currentStyle}
      activeTool={activeTool}
      hasSelection={hasSelection}
      showText={showText}
      showArrowheads={showArrowheads}
      onStyleChange={onStyleChange}
      onReorder={onReorder}
    />
  );
});

function StylePanelInner({
  currentStyle,
  activeTool,
  hasSelection,
  showText = false,
  showArrowheads = false,
  onStyleChange,
  onReorder,
}: StylePanelProps) {
  const showPanel = activeTool !== "selection" || hasSelection;

  if (!showPanel) return null;

  const isTextTool = activeTool === "text" || showText;
  const isLinearTool = activeTool === "arrow" || activeTool === "line" || showArrowheads;

  return (
    <div className="absolute top-16 left-3 z-40 w-60">
      <div className="island p-3 space-y-3">
        {/* Stroke Color */}
        <Section title="Stroke">
          <div className="flex flex-wrap gap-1.5">
            {STROKE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onStyleChange({ strokeColor: color })}
                className={`w-[22px] h-[22px] rounded-md transition-all ${
                  currentStyle.strokeColor === color
                    ? "ring-2 ring-[#6965db] ring-offset-1 scale-110"
                    : "hover:scale-110"
                }`}
                style={{
                  backgroundColor: color,
                  border: color === "#1e1e1e" ? "1px solid #d4d4d8" : "none",
                }}
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
                className={`w-[22px] h-[22px] rounded-md transition-all ${
                  currentStyle.backgroundColor === color
                    ? "ring-2 ring-[#6965db] ring-offset-1 scale-110"
                    : "hover:scale-110"
                }`}
                style={{
                  backgroundColor: color === "transparent" ? "#ffffff" : color,
                  border: "1px solid #d4d4d8",
                  backgroundImage:
                    color === "transparent"
                      ? "linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)"
                      : undefined,
                  backgroundSize: "6px 6px",
                  backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
                }}
              />
            ))}
          </div>
        </Section>

        {/* Fill Style */}
        {currentStyle.backgroundColor !== "transparent" && (
          <Section title="Fill">
            <div className="flex gap-1">
              {(["hachure", "cross-hatch", "solid"] as FillStyle[]).map((fs) => (
                <button
                  key={fs}
                  onClick={() => onStyleChange({ fillStyle: fs })}
                  className={`flex-1 min-w-0 px-1 py-1 text-[11px] text-center truncate rounded-md transition-colors ${
                    currentStyle.fillStyle === fs
                      ? "bg-[#e0dfff] text-[#6965db] font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {fs}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Stroke Width */}
        <Section title="Stroke width">
          <div className="flex gap-1">
            {STROKE_WIDTHS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onStyleChange({ strokeWidth: value })}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  currentStyle.strokeWidth === value
                    ? "bg-[#e0dfff] text-[#6965db] font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* Stroke Style */}
        <Section title="Stroke style">
          <div className="flex gap-1">
            {(["solid", "dashed", "dotted"] as StrokeStyle[]).map((ss) => (
              <button
                key={ss}
                onClick={() => onStyleChange({ strokeStyle: ss })}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  currentStyle.strokeStyle === ss
                    ? "bg-[#e0dfff] text-[#6965db] font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {ss}
              </button>
            ))}
          </div>
        </Section>

        {/* Sloppiness / Roughness */}
        <Section title="Sloppiness">
          <div className="flex gap-1">
            {ROUGHNESS_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onStyleChange({ roughness: value })}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  currentStyle.roughness === value
                    ? "bg-[#e0dfff] text-[#6965db] font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* Edges */}
        {(activeTool === "rectangle" || activeTool === "diamond") && (
          <Section title="Edges">
            <div className="flex gap-1">
              <button
                onClick={() => onStyleChange({ roundness: 0 })}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  currentStyle.roundness === 0
                    ? "bg-[#e0dfff] text-[#6965db] font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Sharp
              </button>
              <button
                onClick={() => onStyleChange({ roundness: 12 })}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  currentStyle.roundness > 0
                    ? "bg-[#e0dfff] text-[#6965db] font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Round
              </button>
            </div>
          </Section>
        )}

        {/* Opacity */}
        <Section title={`Opacity — ${currentStyle.opacity}%`}>
          <input
            type="range"
            min={10}
            max={100}
            value={currentStyle.opacity}
            onChange={(e) =>
              onStyleChange({ opacity: parseInt(e.target.value, 10) })
            }
            className="w-full"
          />
        </Section>

        {/* Font options (text tool) */}
        {isTextTool && (
          <>
            <Section title="Font family">
              <div className="flex gap-1">
                {(["hand", "normal", "code"] as FontFamily[]).map((ff) => (
                  <button
                    key={ff}
                    onClick={() => onStyleChange({ fontFamily: ff })}
                    className={`flex-1 min-w-0 px-1 py-1 text-[11px] text-center truncate rounded-md transition-colors ${
                      currentStyle.fontFamily === ff
                        ? "bg-[#e0dfff] text-[#6965db] font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {ff}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Font size">
              <div className="flex gap-1">
                {FONT_SIZES.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => onStyleChange({ fontSize: value })}
                    className={`flex-1 min-w-0 px-1 py-1 text-[11px] text-center truncate rounded-md transition-colors ${
                      currentStyle.fontSize === value
                        ? "bg-[#e0dfff] text-[#6965db] font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Arrowheads */}
        {isLinearTool && (
          <Section title="Arrowheads">
            <div className="flex gap-1">
              {(["none", "arrow", "bar", "dot"] as const).map((ah) => (
                <button
                  key={ah}
                  onClick={() => onStyleChange({ endArrowhead: ah })}
                  className={`flex-1 min-w-0 px-1 py-1 text-[11px] text-center truncate rounded-md transition-colors ${
                    currentStyle.endArrowhead === ah
                      ? "bg-[#e0dfff] text-[#6965db] font-medium"
                      : "text-gray-600 hover:bg-gray-100"
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
          <Section title="Layers">
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => onReorder("front")}
                className="px-1 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                title="Bring to front"
              >
                ⤒
              </button>
              <button
                onClick={() => onReorder("forward")}
                className="px-1 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                title="Bring forward"
              >
                ↑
              </button>
              <button
                onClick={() => onReorder("backward")}
                className="px-1 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                title="Send backward"
              >
                ↓
              </button>
              <button
                onClick={() => onReorder("back")}
                className="px-1 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
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
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">{title}</div>
      {children}
    </div>
  );
}
