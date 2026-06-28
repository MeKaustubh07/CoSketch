/**
 * rough-renderer.ts — Wraps rough.js + Canvas 2D context.
 * Single render() entrypoint called from the rAF loop.
 *
 * Shapes are generated in LOCAL coordinates (origin 0,0) and positioned
 * with ctx.translate. This means MOVING an element never regenerates its
 * rough.js drawable — only resizing / restyling does. Drawables are cached
 * by a geometry+style signature (position excluded).
 */

import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Drawable } from "roughjs/bin/core";
import type { CanvasElement, Viewport, FontFamily } from "./types";
import {
  getBoundingBox,
  getHandles,
  getSelectionBounds,
  SELECTION_PAD,
  ROTATE_OFFSET,
  HANDLE_SIZE,
} from "./scene";

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

// ─── Cache signature (position-independent) ────────────────────────────────

function cacheSig(el: CanvasElement): string {
  const bb = getBoundingBox(el);
  let s =
    `${el.type}|${Math.round(bb.width)}|${Math.round(bb.height)}|${el.seed}|` +
    `${el.roughness}|${el.strokeColor}|${el.strokeWidth}|${el.backgroundColor}|${el.fillStyle}`;
  if (el.type === "rectangle" || el.type === "diamond") s += `|${el.roundness}`;
  return s;
}

// ─── Renderer class ───────────────────────────────────────────────────────

interface CacheEntry {
  sig: string;
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
   * `width`/`height` are CSS pixels (not device pixels).
   */
  render(
    elements: Map<string, CanvasElement>,
    elementOrder: readonly string[],
    viewport: Viewport,
    selectedIds: string[],
    editingTextId: string | null,
    width: number,
    height: number
  ): void {
    const { ctx } = this;

    // Clear (in CSS-pixel space — caller has set the dpr transform)
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
      this.renderElement(element, viewport, width, height);
    }

    ctx.restore();

    // Selection UI in SCREEN space (constant size at any zoom)
    if (selectedIds.length > 0) {
      this.renderSelection(elements, selectedIds, viewport);
    }
  }

  // ─── Grid ─────────────────────────────────────────────────────────────

  private drawGrid(viewport: Viewport, width: number, height: number): void {
    const { ctx } = this;
    const gridSize = 20;
    const effectiveGrid = gridSize * viewport.zoom;

    if (effectiveGrid < 8) return; // Don't draw grid when zoomed out too far

    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.04)";
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

  private renderElement(
    element: CanvasElement,
    viewport: Viewport,
    cssW: number,
    cssH: number
  ): void {
    const { ctx } = this;
    const bb = getBoundingBox(element);

    // Viewport culling (screen-space, CSS px)
    const screenX = bb.x * viewport.zoom + viewport.scrollX;
    const screenY = bb.y * viewport.zoom + viewport.scrollY;
    const screenW = bb.width * viewport.zoom;
    const screenH = bb.height * viewport.zoom;
    if (
      screenX + screenW < -200 ||
      screenY + screenH < -200 ||
      screenX > cssW + 200 ||
      screenY > cssH + 200
    ) {
      return;
    }

    // Origin: point-based elements anchor at element.x/y; shapes at bb.x/y.
    const pointBased =
      element.type === "line" ||
      element.type === "arrow" ||
      element.type === "freedraw" ||
      element.type === "text";
    const ox = pointBased ? element.x : bb.x;
    const oy = pointBased ? element.y : bb.y;

    ctx.save();
    ctx.globalAlpha = element.opacity / 100;

    // Rotation around the bounding-box center
    if (element.angle) {
      const cx = bb.x + bb.width / 2;
      const cy = bb.y + bb.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(element.angle);
      ctx.translate(-cx, -cy);
    }

    ctx.translate(ox, oy);

    const dash = getLineDash(element.strokeStyle, element.strokeWidth);
    if (dash.length) ctx.setLineDash(dash);

    switch (element.type) {
      case "rectangle":
        this.renderRect(element, bb.width, bb.height);
        break;
      case "ellipse":
        this.renderEllipse(element, bb.width, bb.height);
        break;
      case "diamond":
        this.renderDiamond(element, bb.width, bb.height);
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
      fill:
        element.backgroundColor !== "transparent"
          ? element.backgroundColor
          : undefined,
      fillStyle: element.fillStyle,
    };
  }

  private getOrCreateDrawable(
    element: CanvasElement,
    createFn: () => Drawable
  ): Drawable {
    const sig = cacheSig(element);
    const cached = this.cache.get(element.id);
    if (cached && cached.sig === sig) return cached.drawable;
    const drawable = createFn();
    this.cache.set(element.id, { sig, drawable });
    return drawable;
  }

  private renderRect(element: CanvasElement, w: number, h: number): void {
    const opts = this.getRoughOptions(element);
    const drawable = this.getOrCreateDrawable(element, () =>
      this.rc.generator.rectangle(0, 0, w, h, opts)
    );
    this.rc.draw(drawable);
  }

  private renderEllipse(element: CanvasElement, w: number, h: number): void {
    const opts = this.getRoughOptions(element);
    const drawable = this.getOrCreateDrawable(element, () =>
      this.rc.generator.ellipse(w / 2, h / 2, w, h, opts)
    );
    this.rc.draw(drawable);
  }

  private renderDiamond(element: CanvasElement, w: number, h: number): void {
    const opts = this.getRoughOptions(element);
    const points: [number, number][] = [
      [w / 2, 0],
      [w, h / 2],
      [w / 2, h],
      [0, h / 2],
    ];
    const drawable = this.getOrCreateDrawable(element, () =>
      this.rc.generator.polygon(points, opts)
    );
    this.rc.draw(drawable);
  }

  private renderLinear(element: CanvasElement): void {
    if (element.type !== "line" && element.type !== "arrow") return;
    if (element.points.length < 2) return;

    const opts = this.getRoughOptions(element);
    const pts: [number, number][] = element.points.map(([px, py]) => [px, py]);

    const drawable = this.getOrCreateDrawable(element, () =>
      this.rc.generator.linearPath(pts, opts)
    );
    this.rc.draw(drawable);

    if (element.type === "arrow") {
      this.drawArrowhead(pts, element.startArrowhead, "start", element.strokeColor, element.strokeWidth);
      this.drawArrowhead(pts, element.endArrowhead, "end", element.strokeColor, element.strokeWidth);
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
    const headLen = 12 + strokeWidth * 2;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (type === "arrow") {
      ctx.beginPath();
      ctx.moveTo(
        tip[0] - headLen * Math.cos(angle - Math.PI / 7),
        tip[1] - headLen * Math.sin(angle - Math.PI / 7)
      );
      ctx.lineTo(tip[0], tip[1]);
      ctx.lineTo(
        tip[0] - headLen * Math.cos(angle + Math.PI / 7),
        tip[1] - headLen * Math.sin(angle + Math.PI / 7)
      );
      ctx.stroke();
    } else if (type === "dot") {
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], strokeWidth * 2 + 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "bar") {
      const perp = angle + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(tip[0] + headLen * 0.5 * Math.cos(perp), tip[1] + headLen * 0.5 * Math.sin(perp));
      ctx.lineTo(tip[0] - headLen * 0.5 * Math.cos(perp), tip[1] - headLen * 0.5 * Math.sin(perp));
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderFreedraw(element: CanvasElement): void {
    if (element.type !== "freedraw" || element.points.length < 1) return;

    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = element.strokeColor;
    ctx.lineWidth = element.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);

    ctx.beginPath();
    const [fx, fy] = element.points[0];
    ctx.moveTo(fx, fy);
    if (element.points.length === 1) {
      // dot
      ctx.lineTo(fx + 0.1, fy + 0.1);
    } else {
      for (let i = 1; i < element.points.length; i++) {
        ctx.lineTo(element.points[i][0], element.points[i][1]);
      }
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
    ctx.setLineDash([]);

    const lines = element.text.split("\n");
    const lineHeight = element.fontSize * 1.25;
    let tx = 0;
    if (element.textAlign === "center") tx = element.width / 2;
    else if (element.textAlign === "right") tx = element.width;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], tx, i * lineHeight);
    }
    ctx.restore();
  }

  // ─── Selection rendering ──────────────────────────────────────────────

  private renderSelection(
    elements: Map<string, CanvasElement>,
    selectedIds: string[],
    viewport: Viewport
  ): void {
    const { ctx } = this;
    const z = viewport.zoom;
    const toScreenX = (x: number) => x * z + viewport.scrollX;
    const toScreenY = (y: number) => y * z + viewport.scrollY;

    const els = selectedIds
      .map((id) => elements.get(id))
      .filter((el): el is CanvasElement => !!el && !el.isDeleted);
    if (els.length === 0) return;

    const COLOR = "#6965db";

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLOR;
    ctx.setLineDash([]);

    if (els.length === 1) {
      // Single element: tight box + 8 resize handles + rotate handle
      const bb = getBoundingBox(els[0]);
      const x = toScreenX(bb.x) - SELECTION_PAD;
      const y = toScreenY(bb.y) - SELECTION_PAD;
      const w = bb.width * z + SELECTION_PAD * 2;
      const h = bb.height * z + SELECTION_PAD * 2;

      ctx.strokeRect(x + 0.5, y + 0.5, w, h);

      // Stem up to the rotate handle
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w / 2, y - ROTATE_OFFSET);
      ctx.stroke();

      const handles = getHandles(els[0], SELECTION_PAD / z, ROTATE_OFFSET / z);
      for (const handle of handles) {
        this.drawHandle(toScreenX(handle.x), toScreenY(handle.y), handle.type === "rotate");
      }
    } else {
      // Multi-select: light per-element outline + dashed union box
      for (const el of els) {
        const bb = getBoundingBox(el);
        ctx.globalAlpha = 0.5;
        ctx.strokeRect(
          toScreenX(bb.x) - 2,
          toScreenY(bb.y) - 2,
          bb.width * z + 4,
          bb.height * z + 4
        );
      }
      ctx.globalAlpha = 1;
      const bounds = getSelectionBounds(els);
      if (bounds) {
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          toScreenX(bounds.x) - SELECTION_PAD,
          toScreenY(bounds.y) - SELECTION_PAD,
          bounds.width * z + SELECTION_PAD * 2,
          bounds.height * z + SELECTION_PAD * 2
        );
      }
    }

    ctx.restore();
  }

  private drawHandle(x: number, y: number, isRotate: boolean): void {
    const { ctx } = this;
    const s = HANDLE_SIZE;

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#6965db";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    if (isRotate) {
      ctx.beginPath();
      ctx.arc(x, y, s / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      const r = 2;
      const hx = x - s / 2;
      const hy = y - s / 2;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(hx, hy, s, s, r);
      } else {
        ctx.rect(hx, hy, s, s);
      }
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  invalidate(elementId: string): void {
    this.cache.delete(elementId);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
