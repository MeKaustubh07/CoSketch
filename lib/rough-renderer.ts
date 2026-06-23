/**
 * rough-renderer.ts — Wraps rough.js + Canvas 2D context.
 * Single render() entrypoint called from the rAF loop.
 *
 * Caches RoughCanvas drawables keyed by element id + version
 * so we only regenerate when an element actually changes.
 */

import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Drawable } from "roughjs/bin/core";
import type {
  CanvasElement,
  Viewport,
  HandleInfo,
  FontFamily,
} from "./types";
import { getBoundingBox, getHandles } from "./scene";

// ─── Font mapping ─────────────────────────────────────────────────────────

const FONT_MAP: Record<FontFamily, string> = {
  hand: "'Caveat', cursive",
  normal: "'Inter', sans-serif",
  code: "'Fira Code', 'Courier New', monospace",
};

function getFontString(fontSize: number, fontFamily: FontFamily): string {
  return `${fontSize}px ${FONT_MAP[fontFamily]}`;
}

// ─── Stroke dash patterns ─────────────────────────────────────────────────

function getLineDash(strokeStyle: string, strokeWidth: number): number[] {
  switch (strokeStyle) {
    case "dashed":
      return [8 * strokeWidth, 4 * strokeWidth];
    case "dotted":
      return [2 * strokeWidth, 2 * strokeWidth];
    default:
      return [];
  }
}

// ─── Renderer class ───────────────────────────────────────────────────────

interface CacheEntry {
  version: number;
  drawable: Drawable;
}

export class RoughRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rc: RoughCanvas;
  private cache = new Map<string, CacheEntry>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.rc = rough.canvas(canvas);
  }

  /**
   * The one render function called from requestAnimationFrame.
   */
  render(
    elements: Map<string, CanvasElement>,
    elementOrder: string[],
    viewport: Viewport,
    selectedIds: string[],
    editingTextId: string | null
  ): void {
    const { ctx } = this;
    const { width, height } = this.canvas;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    this.drawGrid(viewport, width, height);

    // Apply viewport transform
    ctx.save();
    ctx.translate(viewport.scrollX, viewport.scrollY);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Render elements in z-order
    for (const id of elementOrder) {
      const element = elements.get(id);
      if (!element || element.isDeleted) continue;
      // Skip text being edited — the overlay handles that
      if (element.type === "text" && element.id === editingTextId) continue;

      this.renderElement(element, viewport);
    }

    // Render selection UI
    if (selectedIds.length > 0) {
      this.renderSelection(elements, selectedIds, viewport);
    }

    ctx.restore();
  }

  // ─── Grid ─────────────────────────────────────────────────────────────

  private drawGrid(viewport: Viewport, width: number, height: number): void {
    const { ctx } = this;
    const gridSize = 20;
    const effectiveGrid = gridSize * viewport.zoom;

    if (effectiveGrid < 6) return; // Don't draw grid when zoomed out too far

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;

    const offsetX = viewport.scrollX % effectiveGrid;
    const offsetY = viewport.scrollY % effectiveGrid;

    ctx.beginPath();
    for (let x = offsetX; x < width; x += effectiveGrid) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, height);
    }
    for (let y = offsetY; y < height; y += effectiveGrid) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(width, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ─── Element rendering ────────────────────────────────────────────────

  private renderElement(element: CanvasElement, viewport: Viewport): void {
    const { ctx } = this;

    // Viewport culling
    const bb = getBoundingBox(element);
    const screenX = bb.x * viewport.zoom + viewport.scrollX;
    const screenY = bb.y * viewport.zoom + viewport.scrollY;
    const screenW = bb.width * viewport.zoom;
    const screenH = bb.height * viewport.zoom;

    if (
      screenX + screenW < -100 ||
      screenY + screenH < -100 ||
      screenX > this.canvas.width + 100 ||
      screenY > this.canvas.height + 100
    ) {
      return; // Off-screen, skip
    }

    ctx.save();
    ctx.globalAlpha = element.opacity / 100;

    // Apply rotation
    if (element.angle !== 0) {
      const cx = element.x + element.width / 2;
      const cy = element.y + element.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(element.angle);
      ctx.translate(-cx, -cy);
    }

    // Set stroke dash
    const dash = getLineDash(element.strokeStyle, element.strokeWidth);
    if (dash.length) {
      ctx.setLineDash(dash);
    }

    switch (element.type) {
      case "rectangle":
        this.renderRect(element);
        break;
      case "ellipse":
        this.renderEllipse(element);
        break;
      case "diamond":
        this.renderDiamond(element);
        break;
      case "line":
      case "arrow":
        this.renderLinear(element);
        break;
      case "freedraw":
        this.renderFreedraw(element);
        break;
      case "text":
        this.renderText(element);
        break;
    }

    ctx.restore();
  }

  private getRoughOptions(element: CanvasElement) {
    return {
      seed: element.seed,
      roughness: element.roughness,
      stroke: element.strokeColor,
      strokeWidth: element.strokeWidth,
      fill: element.backgroundColor !== "transparent" ? element.backgroundColor : undefined,
      fillStyle: element.fillStyle,
    };
  }

  private getOrCreateDrawable(
    element: CanvasElement,
    createFn: () => Drawable
  ): Drawable {
    const cached = this.cache.get(element.id);
    if (cached && cached.version === element.version) {
      return cached.drawable;
    }
    const drawable = createFn();
    this.cache.set(element.id, { version: element.version, drawable });
    return drawable;
  }

  private renderRect(element: CanvasElement): void {
    const opts = this.getRoughOptions(element);
    const bb = getBoundingBox(element);
    const drawable = this.getOrCreateDrawable(element, () =>
      this.rc.generator.rectangle(bb.x, bb.y, bb.width, bb.height, opts)
    );
    this.rc.draw(drawable);
  }

  private renderEllipse(element: CanvasElement): void {
    const opts = this.getRoughOptions(element);
    const bb = getBoundingBox(element);
    const drawable = this.getOrCreateDrawable(element, () =>
      this.rc.generator.ellipse(
        bb.x + bb.width / 2,
        bb.y + bb.height / 2,
        bb.width,
        bb.height,
        opts
      )
    );
    this.rc.draw(drawable);
  }

  private renderDiamond(element: CanvasElement): void {
    const opts = this.getRoughOptions(element);
    const bb = getBoundingBox(element);
    const cx = bb.x + bb.width / 2;
    const cy = bb.y + bb.height / 2;
    const points: [number, number][] = [
      [cx, bb.y],
      [bb.x + bb.width, cy],
      [cx, bb.y + bb.height],
      [bb.x, cy],
    ];
    const drawable = this.getOrCreateDrawable(element, () =>
      this.rc.generator.polygon(points, opts)
    );
    this.rc.draw(drawable);
  }

  private renderLinear(element: CanvasElement): void {
    if (element.type !== "line" && element.type !== "arrow") return;

    const opts = this.getRoughOptions(element);
    const absolutePoints: [number, number][] = element.points.map(([px, py]) => [
      element.x + px,
      element.y + py,
    ]);

    if (absolutePoints.length < 2) return;

    const drawable = this.getOrCreateDrawable(element, () =>
      this.rc.generator.linearPath(absolutePoints, opts)
    );
    this.rc.draw(drawable);

    // Draw arrowheads
    if (element.type === "arrow" && absolutePoints.length >= 2) {
      this.drawArrowhead(
        absolutePoints,
        element.startArrowhead,
        "start",
        element.strokeColor,
        element.strokeWidth
      );
      this.drawArrowhead(
        absolutePoints,
        element.endArrowhead,
        "end",
        element.strokeColor,
        element.strokeWidth
      );
    }
  }

  private drawArrowhead(
    points: [number, number][],
    type: string,
    end: "start" | "end",
    color: string,
    strokeWidth: number
  ): void {
    if (type === "none") return;

    const { ctx } = this;
    let tip: [number, number], from: [number, number];

    if (end === "end") {
      tip = points[points.length - 1];
      from = points[points.length - 2];
    } else {
      tip = points[0];
      from = points[1];
    }

    const angle = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
    const headLen = 15 + strokeWidth * 2;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = strokeWidth;

    if (type === "arrow") {
      ctx.beginPath();
      ctx.moveTo(
        tip[0] - headLen * Math.cos(angle - Math.PI / 6),
        tip[1] - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(tip[0], tip[1]);
      ctx.lineTo(
        tip[0] - headLen * Math.cos(angle + Math.PI / 6),
        tip[1] - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    } else if (type === "dot") {
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], strokeWidth * 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "bar") {
      const perpAngle = angle + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(
        tip[0] + headLen * 0.5 * Math.cos(perpAngle),
        tip[1] + headLen * 0.5 * Math.sin(perpAngle)
      );
      ctx.lineTo(
        tip[0] - headLen * 0.5 * Math.cos(perpAngle),
        tip[1] - headLen * 0.5 * Math.sin(perpAngle)
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderFreedraw(element: CanvasElement): void {
    if (element.type !== "freedraw" || element.points.length < 2) return;

    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = element.strokeColor;
    ctx.lineWidth = element.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    const [firstX, firstY] = element.points[0];
    ctx.moveTo(element.x + firstX, element.y + firstY);

    for (let i = 1; i < element.points.length; i++) {
      const [px, py] = element.points[i];
      ctx.lineTo(element.x + px, element.y + py);
    }
    ctx.stroke();
    ctx.restore();
  }

  private renderText(element: CanvasElement): void {
    if (element.type !== "text" || !element.text) return;

    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = element.strokeColor;
    ctx.font = getFontString(element.fontSize, element.fontFamily);
    ctx.textBaseline = "top";
    ctx.textAlign = element.textAlign;

    const lines = element.text.split("\n");
    const lineHeight = element.fontSize * 1.4;
    let textX = element.x;
    if (element.textAlign === "center") textX = element.x + element.width / 2;
    else if (element.textAlign === "right") textX = element.x + element.width;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], textX, element.y + i * lineHeight);
    }

    ctx.restore();
  }

  // ─── Selection rendering ──────────────────────────────────────────────

  private renderSelection(
    elements: Map<string, CanvasElement>,
    selectedIds: string[],
    _viewport: Viewport
  ): void {
    const { ctx } = this;

    for (const id of selectedIds) {
      const element = elements.get(id);
      if (!element || element.isDeleted) continue;

      const bb = getBoundingBox(element);
      const padding = 4;

      // Selection outline
      ctx.save();
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(
        bb.x - padding,
        bb.y - padding,
        bb.width + padding * 2,
        bb.height + padding * 2
      );

      // Handles
      const handles = getHandles(element);
      for (const handle of handles) {
        this.drawHandle(handle);
      }

      ctx.restore();
    }
  }

  private drawHandle(handle: HandleInfo): void {
    const { ctx } = this;
    const size = 8;

    ctx.save();

    if (handle.type === "rotate") {
      // Circle for rotate handle
      ctx.fillStyle = "#6366f1";
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Square for resize handles
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 1.5;
      ctx.fillRect(handle.x - size / 2, handle.y - size / 2, size, size);
      ctx.strokeRect(handle.x - size / 2, handle.y - size / 2, size, size);
    }

    ctx.restore();
  }

  /**
   * Invalidate cache for an element (e.g., when it's been deleted)
   */
  invalidate(elementId: string): void {
    this.cache.delete(elementId);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
