/**
 * text.ts — Client-side text measurement (shared offscreen canvas).
 * Keeps the canvas renderer, the editor overlay, and selection bounds in sync.
 */

import type { FontFamily } from "./types";

export const FONT_MAP: Record<FontFamily, string> = {
  hand: "'Caveat', cursive",
  normal: "'Inter', sans-serif",
  code: "'Fira Code', 'Courier New', monospace",
};

export const LINE_HEIGHT = 1.25;

let measureCtx: CanvasRenderingContext2D | null = null;

function getCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = document.createElement("canvas");
    measureCtx = c.getContext("2d")!;
  }
  return measureCtx;
}

export function measureText(
  text: string,
  fontSize: number,
  fontFamily: FontFamily
): { width: number; height: number } {
  const ctx = getCtx();
  ctx.font = `${fontSize}px ${FONT_MAP[fontFamily]}`;
  const lines = text.length === 0 ? [""] : text.split("\n");
  let width = 0;
  for (const line of lines) {
    width = Math.max(width, ctx.measureText(line).width);
  }
  return {
    width: Math.max(width, fontSize * 0.5),
    height: lines.length * fontSize * LINE_HEIGHT,
  };
}
