/**
 * export.ts — Export canvas to PNG.
 * Runs entirely client-side.
 */

import type { CanvasElement, Viewport } from "./types";
import { getBoundingBox } from "./scene";

// ─── PNG export ───────────────────────────────────────────────────────────

export function exportToPNG(
  sourceCanvas: HTMLCanvasElement,
  elements: Map<string, CanvasElement>,
  elementOrder: string[],
  _viewport: Viewport,
  options: {
    padding?: number;
    backgroundColor?: string;
    scale?: number;
  } = {}
): Promise<Blob | null> {
  const { padding = 40, backgroundColor = "#ffffff", scale = 2 } = options;

  // Calculate bounding box of all visible elements
  const visibleElements = elementOrder
    .map((id) => elements.get(id))
    .filter((el): el is CanvasElement => !!el && !el.isDeleted);

  if (visibleElements.length === 0) return Promise.resolve(null);

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const el of visibleElements) {
    const bb = getBoundingBox(el);
    minX = Math.min(minX, bb.x);
    minY = Math.min(minY, bb.y);
    maxX = Math.max(maxX, bb.x + bb.width);
    maxY = Math.max(maxY, bb.y + bb.height);
  }

  const width = (maxX - minX + padding * 2) * scale;
  const height = (maxY - minY + padding * 2) * scale;

  // Create export canvas
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext("2d")!;

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Draw from source canvas
  ctx.scale(scale, scale);
  ctx.translate(-minX + padding, -minY + padding);

  const dpr = window.devicePixelRatio || 1;
  const sourceWidth = sourceCanvas.width / dpr;
  const sourceHeight = sourceCanvas.height / dpr;

  ctx.drawImage(
    sourceCanvas,
    0, 0, sourceCanvas.width, sourceCanvas.height,
    minX - padding, minY - padding, sourceWidth, sourceHeight
  );

  return new Promise((resolve) => {
    exportCanvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
  });
}

export async function downloadPNG(
  sourceCanvas: HTMLCanvasElement,
  elements: Map<string, CanvasElement>,
  elementOrder: string[],
  viewport: Viewport,
  filename = "cosketch-export"
): Promise<void> {
  const blob = await exportToPNG(sourceCanvas, elements, elementOrder, viewport);
  if (!blob) return;
  downloadBlob(blob, `${filename}.png`);
}

// ─── Helper ───────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
