/**
 * scene.ts — Pure functions for canvas element operations.
 * No React or Liveblocks dependency — easily testable.
 */

import { nanoid } from "nanoid";
import type {
  CanvasElement,
  Point,
  HandleInfo,
  ToolName,
  AppState,
  RectangleElement,
  EllipseElement,
  DiamondElement,
  TextElement,
  LineElement,
  ArrowElement,
  FreedrawElement,
} from "./types";

// ─── Random seed generator ────────────────────────────────────────────────

let seedCounter = Math.floor(Math.random() * 1_000_000);
export function newSeed(): number {
  return seedCounter++;
}

// ─── Element creation ─────────────────────────────────────────────────────

export function createElement(
  type: CanvasElement["type"],
  x: number,
  y: number,
  style: AppState["currentStyle"]
): CanvasElement {
  const base = {
    id: nanoid(16),
    x,
    y,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: style.strokeColor,
    backgroundColor: style.backgroundColor,
    fillStyle: style.fillStyle,
    strokeWidth: style.strokeWidth,
    strokeStyle: style.strokeStyle,
    roughness: style.roughness,
    opacity: style.opacity,
    seed: newSeed(),
    groupIds: [],
    boundElements: [],
    isDeleted: false,
    version: 1,
    locked: false,
  };

  switch (type) {
    case "rectangle":
      return { ...base, type: "rectangle", roundness: style.roundness } as RectangleElement;
    case "ellipse":
      return { ...base, type: "ellipse" } as EllipseElement;
    case "diamond":
      return { ...base, type: "diamond", roundness: style.roundness } as DiamondElement;
    case "text":
      return {
        ...base,
        type: "text",
        text: "",
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        textAlign: "left",
        verticalAlign: "top",
        containerId: null,
        autoResize: true,
        width: 100,
        height: style.fontSize * 1.5,
      } as TextElement;
    case "line":
      return {
        ...base,
        type: "line",
        points: [[0, 0]],
        startArrowhead: "none",
        endArrowhead: "none",
        startBinding: null,
        endBinding: null,
      } as LineElement;
    case "arrow":
      return {
        ...base,
        type: "arrow",
        points: [[0, 0]],
        startArrowhead: style.startArrowhead,
        endArrowhead: style.endArrowhead,
        startBinding: null,
        endBinding: null,
      } as ArrowElement;
    case "freedraw":
      return {
        ...base,
        type: "freedraw",
        points: [],
        pressures: [],
      } as FreedrawElement;
    case "image":
      return {
        ...base,
        type: "image",
        fileId: "",
        naturalWidth: 0,
        naturalHeight: 0,
      };
  }
}

// ─── Bounding box ─────────────────────────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getBoundingBox(element: CanvasElement): BoundingBox {
  if (element.type === "line" || element.type === "arrow" || element.type === "freedraw") {
    const points =
      element.type === "freedraw" ? element.points : element.points;
    if (points.length === 0) {
      return { x: element.x, y: element.y, width: 0, height: 0 };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const [px, py] of points) {
      const ax = element.x + px;
      const ay = element.y + py;
      minX = Math.min(minX, ax);
      minY = Math.min(minY, ay);
      maxX = Math.max(maxX, ax);
      maxY = Math.max(maxY, ay);
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  // For shapes with width/height, handle negative dimensions from right-to-left drawing
  const x = element.width < 0 ? element.x + element.width : element.x;
  const y = element.height < 0 ? element.y + element.height : element.y;
  return {
    x,
    y,
    width: Math.abs(element.width),
    height: Math.abs(element.height),
  };
}

export function getSelectionBounds(elements: CanvasElement[]): BoundingBox | null {
  if (elements.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const el of elements) {
    const bb = getBoundingBox(el);
    minX = Math.min(minX, bb.x);
    minY = Math.min(minY, bb.y);
    maxX = Math.max(maxX, bb.x + bb.width);
    maxY = Math.max(maxY, bb.y + bb.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ─── Hit testing ──────────────────────────────────────────────────────────

const HIT_THRESHOLD = 10; // pixels

export function hitTest(
  element: CanvasElement,
  point: Point,
  zoom: number
): boolean {
  if (element.isDeleted || element.locked) return false;

  const threshold = HIT_THRESHOLD / zoom;
  const [px, py] = point;
  const bb = getBoundingBox(element);

  switch (element.type) {
    case "rectangle":
    case "image":
    case "text":
      return (
        px >= bb.x - threshold &&
        px <= bb.x + bb.width + threshold &&
        py >= bb.y - threshold &&
        py <= bb.y + bb.height + threshold
      );

    case "ellipse": {
      const cx = bb.x + bb.width / 2;
      const cy = bb.y + bb.height / 2;
      const rx = bb.width / 2 + threshold;
      const ry = bb.height / 2 + threshold;
      if (rx === 0 || ry === 0) return false;
      const dx = px - cx;
      const dy = py - cy;
      return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
    }

    case "diamond": {
      const cx = bb.x + bb.width / 2;
      const cy = bb.y + bb.height / 2;
      const hw = bb.width / 2 + threshold;
      const hh = bb.height / 2 + threshold;
      if (hw === 0 || hh === 0) return false;
      return Math.abs(px - cx) / hw + Math.abs(py - cy) / hh <= 1;
    }

    case "line":
    case "arrow":
    case "freedraw": {
      const points = element.type === "freedraw" ? element.points : element.points;
      for (let i = 0; i < points.length - 1; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];
        const dist = distanceToSegment(
          px,
          py,
          element.x + x1,
          element.y + y1,
          element.x + x2,
          element.y + y2
        );
        if (dist <= threshold) return true;
      }
      // Single-point line
      if (points.length === 1) {
        const [x1, y1] = points[0];
        const dist = Math.hypot(px - (element.x + x1), py - (element.y + y1));
        return dist <= threshold;
      }
      return false;
    }
  }
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ─── Handle positions ─────────────────────────────────────────────────────

const HANDLE_SIZE = 8;

export function getHandles(element: CanvasElement): HandleInfo[] {
  const bb = getBoundingBox(element);
  const { x, y, width: w, height: h } = bb;

  return [
    { type: "nw", x, y },
    { type: "n", x: x + w / 2, y },
    { type: "ne", x: x + w, y },
    { type: "e", x: x + w, y: y + h / 2 },
    { type: "se", x: x + w, y: y + h },
    { type: "s", x: x + w / 2, y: y + h },
    { type: "sw", x, y: y + h },
    { type: "w", x, y: y + h / 2 },
    { type: "rotate", x: x + w / 2, y: y - 30 },
  ];
}

export function isPointInHandle(
  point: Point,
  handle: HandleInfo,
  zoom: number
): boolean {
  const size = HANDLE_SIZE / zoom;
  return (
    Math.abs(point[0] - handle.x) <= size &&
    Math.abs(point[1] - handle.y) <= size
  );
}

export function getHitHandle(
  point: Point,
  element: CanvasElement,
  zoom: number
): HandleInfo | null {
  const handles = getHandles(element);
  for (const handle of handles) {
    if (isPointInHandle(point, handle, zoom)) {
      return handle;
    }
  }
  return null;
}

// ─── Element manipulation ─────────────────────────────────────────────────

export function moveElement(
  element: CanvasElement,
  dx: number,
  dy: number
): CanvasElement {
  return {
    ...element,
    x: element.x + dx,
    y: element.y + dy,
    version: element.version + 1,
  };
}

export function resizeElement(
  element: CanvasElement,
  handle: HandleInfo["type"],
  dx: number,
  dy: number
): CanvasElement {
  let { x, y, width, height } = element;

  switch (handle) {
    case "nw":
      x += dx; y += dy; width -= dx; height -= dy; break;
    case "n":
      y += dy; height -= dy; break;
    case "ne":
      y += dy; width += dx; height -= dy; break;
    case "e":
      width += dx; break;
    case "se":
      width += dx; height += dy; break;
    case "s":
      height += dy; break;
    case "sw":
      x += dx; width -= dx; height += dy; break;
    case "w":
      x += dx; width -= dx; break;
  }

  return { ...element, x, y, width, height, version: element.version + 1 };
}

export function rotateElement(
  element: CanvasElement,
  angle: number
): CanvasElement {
  return { ...element, angle, version: element.version + 1 };
}

// ─── Selection helpers ────────────────────────────────────────────────────

export function getElementsInSelectionBox(
  elements: CanvasElement[],
  box: BoundingBox
): CanvasElement[] {
  const bx2 = box.x + box.width;
  const by2 = box.y + box.height;
  const sx = Math.min(box.x, bx2);
  const sy = Math.min(box.y, by2);
  const ex = Math.max(box.x, bx2);
  const ey = Math.max(box.y, by2);

  return elements.filter((el) => {
    if (el.isDeleted || el.locked) return false;
    const bb = getBoundingBox(el);
    return bb.x >= sx && bb.y >= sy && bb.x + bb.width <= ex && bb.y + bb.height <= ey;
  });
}

// ─── Duplication ──────────────────────────────────────────────────────────

export function duplicateElement(element: CanvasElement): CanvasElement {
  return {
    ...element,
    id: nanoid(16),
    x: element.x + 20,
    y: element.y + 20,
    seed: newSeed(),
    version: 1,
    groupIds: [],
    boundElements: [],
  };
}

// ─── Z-order ──────────────────────────────────────────────────────────────

export type ReorderDirection = "front" | "back" | "forward" | "backward";

export function reorderElements(
  order: string[],
  id: string,
  direction: ReorderDirection
): string[] {
  const idx = order.indexOf(id);
  if (idx === -1) return order;

  const newOrder = [...order];

  switch (direction) {
    case "front":
      newOrder.splice(idx, 1);
      newOrder.push(id);
      break;
    case "back":
      newOrder.splice(idx, 1);
      newOrder.unshift(id);
      break;
    case "forward":
      if (idx < newOrder.length - 1) {
        [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      }
      break;
    case "backward":
      if (idx > 0) {
        [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
      }
      break;
  }

  return newOrder;
}

// ─── Tool to element type mapping ─────────────────────────────────────────

export function toolToElementType(
  tool: ToolName
): CanvasElement["type"] | null {
  switch (tool) {
    case "rectangle": return "rectangle";
    case "ellipse": return "ellipse";
    case "diamond": return "diamond";
    case "line": return "line";
    case "arrow": return "arrow";
    case "draw": return "freedraw";
    case "text": return "text";
    default: return null;
  }
}

// ─── Screen ↔ Canvas coordinate transforms ────────────────────────────────

export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: { scrollX: number; scrollY: number; zoom: number }
): Point {
  return [
    (screenX - viewport.scrollX) / viewport.zoom,
    (screenY - viewport.scrollY) / viewport.zoom,
  ];
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: { scrollX: number; scrollY: number; zoom: number }
): Point {
  return [
    canvasX * viewport.zoom + viewport.scrollX,
    canvasY * viewport.zoom + viewport.scrollY,
  ];
}
