/**
 * export.ts — Export canvas to PNG or JSON.
 * Runs entirely client-side.
 */

import type { CanvasElement, Viewport } from "./types";
import { getBoundingBox } from "./scene";

// ─── JSON export/import ───────────────────────────────────────────────────

export interface CoSketchFile {
  version: 1;
  appName: "CoSketch";
  elements: CanvasElement[];
  elementOrder: string[];
  exportedAt: string;
}

export function exportToJSON(
  elements: Map<string, CanvasElement>,
  elementOrder: string[]
): string {
  const visibleElements = elementOrder
    .map((id) => elements.get(id))
    .filter((el): el is CanvasElement => !!el && !el.isDeleted);

  const file: CoSketchFile = {
    version: 1,
    appName: "CoSketch",
    elements: visibleElements,
    elementOrder: visibleElements.map((el) => el.id),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(file, null, 2);
}

export function downloadJSON(
  elements: Map<string, CanvasElement>,
  elementOrder: string[],
  filename = "cosketch-export"
): void {
  const json = exportToJSON(elements, elementOrder);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `${filename}.cosketch`);
}

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
  const { padding = 40, backgroundColor = "#09090b", scale = 2 } = options;

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

  // Draw from source canvas (capture the current render)
  // We re-render by drawing the source canvas onto the export canvas
  // with appropriate transforms
  ctx.scale(scale, scale);
  ctx.translate(-minX + padding, -minY + padding);

  // Copy the rendered content from the source canvas
  // The source canvas already has the rendered elements, so we need to
  // account for the viewport transform
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

// ─── Import from JSON ─────────────────────────────────────────────────────

export function parseCoSketchFile(jsonStr: string): CoSketchFile | null {
  try {
    const file = JSON.parse(jsonStr);
    if (file.appName !== "CoSketch" || file.version !== 1) return null;
    if (!Array.isArray(file.elements) || !Array.isArray(file.elementOrder)) return null;
    return file as CoSketchFile;
  } catch {
    return null;
  }
}
