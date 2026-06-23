// ─── Canvas element types ─────────────────────────────────────────────────

export type FillStyle = "hachure" | "cross-hatch" | "solid";
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type FontFamily = "hand" | "normal" | "code";
export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "middle" | "bottom";
export type Arrowhead = "none" | "arrow" | "bar" | "dot";

export type ToolName =
  | "selection"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "draw"
  | "text"
  | "eraser"
  | "pan";

export type Point = [number, number];

export interface BoundElement {
  id: string;
  type: "text" | "arrow";
}

// ─── Base shape (shared by all element types) ──────────────────────────────

export interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number;
  opacity: number;
  seed: number;
  groupIds: string[];
  boundElements: BoundElement[];
  isDeleted: boolean;
  version: number;
  locked: boolean;
}

// ─── Type-specific element shapes ──────────────────────────────────────────

export interface RectangleElement extends BaseElement {
  type: "rectangle";
  roundness: number; // 0 = sharp, > 0 = corner radius
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
}

export interface DiamondElement extends BaseElement {
  type: "diamond";
  roundness: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
  verticalAlign: VerticalAlign;
  containerId: string | null;
  autoResize: boolean;
}

export interface LineElement extends BaseElement {
  type: "line";
  points: Point[];
  startArrowhead: Arrowhead;
  endArrowhead: Arrowhead;
  startBinding: { elementId: string; focus: number; gap: number } | null;
  endBinding: { elementId: string; focus: number; gap: number } | null;
}

export interface ArrowElement extends BaseElement {
  type: "arrow";
  points: Point[];
  startArrowhead: Arrowhead;
  endArrowhead: Arrowhead;
  startBinding: { elementId: string; focus: number; gap: number } | null;
  endBinding: { elementId: string; focus: number; gap: number } | null;
}

export interface FreedrawElement extends BaseElement {
  type: "freedraw";
  points: Point[];
  pressures: number[];
}

export interface ImageElement extends BaseElement {
  type: "image";
  fileId: string;
  naturalWidth: number;
  naturalHeight: number;
}

// ─── Discriminated union ───────────────────────────────────────────────────

export type CanvasElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | TextElement
  | LineElement
  | ArrowElement
  | FreedrawElement
  | ImageElement;

export type ShapeElement = RectangleElement | EllipseElement | DiamondElement;
export type LinearElement = LineElement | ArrowElement;

// ─── Application state ────────────────────────────────────────────────────

export interface Viewport {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface HandleInfo {
  type: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";
  x: number;
  y: number;
}

export interface DragState {
  type: "move" | "resize" | "rotate" | "draw" | "rubberband" | "pan";
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  handle?: HandleInfo["type"];
  elementId?: string;
}

export interface AppState {
  viewport: Viewport;
  activeTool: ToolName;
  selectedIds: string[];
  editingTextId: string | null;
  dragState: DragState | null;

  // Current style defaults for new elements
  currentStyle: {
    strokeColor: string;
    backgroundColor: string;
    fillStyle: FillStyle;
    strokeWidth: number;
    strokeStyle: StrokeStyle;
    roughness: number;
    opacity: number;
    fontFamily: FontFamily;
    fontSize: number;
    roundness: number;
    startArrowhead: Arrowhead;
    endArrowhead: Arrowhead;
  };
}

// ─── Default values ────────────────────────────────────────────────────────

export const DEFAULT_STYLE: AppState["currentStyle"] = {
  strokeColor: "#e2e8f0",
  backgroundColor: "transparent",
  fillStyle: "hachure",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  fontFamily: "hand",
  fontSize: 20,
  roundness: 0,
  startArrowhead: "none",
  endArrowhead: "arrow",
};

export const STROKE_COLORS = [
  "#e2e8f0", // zinc-200
  "#f87171", // red-400
  "#4ade80", // green-400
  "#60a5fa", // blue-400
  "#fb923c", // orange-400
  "#c084fc", // purple-400
];

export const BG_COLORS = [
  "transparent",
  "#1e293b", // zinc-800
  "#7f1d1d", // red-900
  "#14532d", // green-900
  "#1e3a5f", // blue-900
  "#7c2d12", // orange-900
  "#581c87", // purple-900
];

export const FONT_SIZES = [
  { label: "S", value: 16 },
  { label: "M", value: 20 },
  { label: "L", value: 28 },
  { label: "XL", value: 36 },
];

export const STROKE_WIDTHS = [
  { label: "Thin", value: 1 },
  { label: "Bold", value: 2 },
  { label: "Extra Bold", value: 4 },
];

export const ROUGHNESS_OPTIONS = [
  { label: "Architect", value: 0 },
  { label: "Artist", value: 1 },
  { label: "Cartoonist", value: 3 },
];
