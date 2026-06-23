"use client";

import { useRef, useEffect, useCallback, useReducer } from "react";
import { RoughRenderer } from "@/lib/rough-renderer";
import {
  createElement,
  hitTest,
  getHitHandle,
  moveElement,
  resizeElement,
  screenToCanvas,
  getBoundingBox,
  getElementsInSelectionBox,
  duplicateElement,
  reorderElements,
  toolToElementType,
} from "@/lib/scene";
import type {
  CanvasElement,
  AppState,
  DragState,
  ToolName,
  Point,
  FreedrawElement,
  LinearElement,
} from "@/lib/types";
import { DEFAULT_STYLE } from "@/lib/types";
import { Toolbar } from "./Toolbar";
import { StylePanel } from "./StylePanel";
import { ZoomControls } from "./ZoomControls";

// ─── State management ─────────────────────────────────────────────────────

interface CanvasState {
  elements: Map<string, CanvasElement>;
  elementOrder: string[];
  appState: AppState;
}

type CanvasAction =
  | { type: "SET_TOOL"; tool: ToolName }
  | { type: "ADD_ELEMENT"; element: CanvasElement }
  | { type: "UPDATE_ELEMENT"; id: string; updates: Partial<CanvasElement> }
  | { type: "DELETE_ELEMENTS"; ids: string[] }
  | { type: "SET_SELECTION"; ids: string[] }
  | { type: "SET_DRAG"; drag: DragState | null }
  | { type: "SET_VIEWPORT"; viewport: Partial<AppState["viewport"]> }
  | { type: "SET_EDITING_TEXT"; id: string | null }
  | { type: "SET_STYLE"; style: Partial<AppState["currentStyle"]> }
  | { type: "REORDER"; id: string; direction: "front" | "back" | "forward" | "backward" }
  | { type: "DUPLICATE"; ids: string[] }
  | { type: "SET_ELEMENT_ORDER"; order: string[] };

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case "SET_TOOL":
      return {
        ...state,
        appState: { ...state.appState, activeTool: action.tool, selectedIds: [] },
      };

    case "ADD_ELEMENT": {
      const newElements = new Map(state.elements);
      newElements.set(action.element.id, action.element);
      return {
        ...state,
        elements: newElements,
        elementOrder: [...state.elementOrder, action.element.id],
      };
    }

    case "UPDATE_ELEMENT": {
      const el = state.elements.get(action.id);
      if (!el) return state;
      const newElements = new Map(state.elements);
      newElements.set(action.id, { ...el, ...action.updates, version: el.version + 1 } as CanvasElement);
      return { ...state, elements: newElements };
    }

    case "DELETE_ELEMENTS": {
      const newElements = new Map(state.elements);
      for (const id of action.ids) {
        const el = newElements.get(id);
        if (el) {
          newElements.set(id, { ...el, isDeleted: true, version: el.version + 1 } as CanvasElement);
        }
      }
      return {
        ...state,
        elements: newElements,
        appState: { ...state.appState, selectedIds: [] },
      };
    }

    case "SET_SELECTION":
      return {
        ...state,
        appState: { ...state.appState, selectedIds: action.ids },
      };

    case "SET_DRAG":
      return {
        ...state,
        appState: { ...state.appState, dragState: action.drag },
      };

    case "SET_VIEWPORT":
      return {
        ...state,
        appState: {
          ...state.appState,
          viewport: { ...state.appState.viewport, ...action.viewport },
        },
      };

    case "SET_EDITING_TEXT":
      return {
        ...state,
        appState: { ...state.appState, editingTextId: action.id },
      };

    case "SET_STYLE":
      return {
        ...state,
        appState: {
          ...state.appState,
          currentStyle: { ...state.appState.currentStyle, ...action.style },
        },
      };

    case "REORDER":
      return {
        ...state,
        elementOrder: reorderElements(state.elementOrder, action.id, action.direction),
      };

    case "DUPLICATE": {
      const newElements = new Map(state.elements);
      const newOrder = [...state.elementOrder];
      const newIds: string[] = [];
      for (const id of action.ids) {
        const el = state.elements.get(id);
        if (el && !el.isDeleted) {
          const dup = duplicateElement(el);
          newElements.set(dup.id, dup);
          newOrder.push(dup.id);
          newIds.push(dup.id);
        }
      }
      return {
        ...state,
        elements: newElements,
        elementOrder: newOrder,
        appState: { ...state.appState, selectedIds: newIds },
      };
    }

    case "SET_ELEMENT_ORDER":
      return { ...state, elementOrder: action.order };

    default:
      return state;
  }
}

const initialState: CanvasState = {
  elements: new Map(),
  elementOrder: [],
  appState: {
    viewport: { scrollX: 0, scrollY: 0, zoom: 1 },
    activeTool: "selection",
    selectedIds: [],
    editingTextId: null,
    dragState: null,
    currentStyle: { ...DEFAULT_STYLE },
  },
};

// ─── CanvasStage component ────────────────────────────────────────────────

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RoughRenderer | null>(null);
  const [state, dispatch] = useReducer(canvasReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const dirtyRef = useRef(true);
  const drawingElementIdRef = useRef<string | null>(null);

  // Mark dirty on state change
  useEffect(() => {
    dirtyRef.current = true;
  }, [state]);

  // ─── Canvas setup + rAF loop ──────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize renderer
    rendererRef.current = new RoughRenderer(canvas);

    // Size canvas
    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      dirtyRef.current = true;
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // rAF loop
    let rafId: number;
    function loop() {
      if (dirtyRef.current && rendererRef.current && canvas) {
        const s = stateRef.current;
        // Use CSS dimensions for render calculations
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          ctx.save();
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        rendererRef.current.render(
          s.elements,
          s.elementOrder,
          s.appState.viewport,
          s.appState.selectedIds,
          s.appState.editingTextId
        );
        if (ctx) ctx.restore();

        // Draw rubberband selection
        if (s.appState.dragState?.type === "rubberband") {
          const ds = s.appState.dragState;
          const dpr = window.devicePixelRatio || 1;
          if (ctx) {
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.strokeStyle = "#6366f1";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
            const x = Math.min(ds.startX, ds.currentX);
            const y = Math.min(ds.startY, ds.currentY);
            const w = Math.abs(ds.currentX - ds.startX);
            const h = Math.abs(ds.currentY - ds.startY);
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
          }
        }
        dirtyRef.current = false;
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  // ─── Pointer event handlers ───────────────────────────────────────────

  const getCanvasPoint = useCallback(
    (e: React.PointerEvent): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      return screenToCanvas(screenX, screenY, stateRef.current.appState.viewport);
    },
    []
  );

  const getScreenPoint = useCallback(
    (e: React.PointerEvent): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);

      const s = stateRef.current;
      const [cx, cy] = getCanvasPoint(e);
      const [sx, sy] = getScreenPoint(e);
      const tool = s.appState.activeTool;

      // Pan tool or middle button or space
      if (tool === "pan" || e.button === 1) {
        dispatch({
          type: "SET_DRAG",
          drag: { type: "pan", startX: sx, startY: sy, currentX: sx, currentY: sy },
        });
        return;
      }

      if (tool === "selection") {
        // Check if clicking on a handle of a selected element
        for (const selId of s.appState.selectedIds) {
          const el = s.elements.get(selId);
          if (el && !el.isDeleted) {
            const handle = getHitHandle([cx, cy], el, s.appState.viewport.zoom);
            if (handle) {
              dispatch({
                type: "SET_DRAG",
                drag: {
                  type: handle.type === "rotate" ? "rotate" : "resize",
                  startX: cx,
                  startY: cy,
                  currentX: cx,
                  currentY: cy,
                  handle: handle.type,
                  elementId: selId,
                },
              });
              return;
            }
          }
        }

        // Hit-test elements in reverse z-order
        const visibleElements = s.elementOrder
          .map((id) => s.elements.get(id))
          .filter((el): el is CanvasElement => !!el && !el.isDeleted);

        let hitEl: CanvasElement | null = null;
        for (let i = visibleElements.length - 1; i >= 0; i--) {
          if (hitTest(visibleElements[i], [cx, cy], s.appState.viewport.zoom)) {
            hitEl = visibleElements[i];
            break;
          }
        }

        if (hitEl) {
          const isAlreadySelected = s.appState.selectedIds.includes(hitEl.id);
          if (e.shiftKey) {
            // Toggle selection
            dispatch({
              type: "SET_SELECTION",
              ids: isAlreadySelected
                ? s.appState.selectedIds.filter((id) => id !== hitEl!.id)
                : [...s.appState.selectedIds, hitEl.id],
            });
          } else if (!isAlreadySelected) {
            dispatch({ type: "SET_SELECTION", ids: [hitEl.id] });
          }

          // Start move
          dispatch({
            type: "SET_DRAG",
            drag: {
              type: "move",
              startX: cx,
              startY: cy,
              currentX: cx,
              currentY: cy,
            },
          });
        } else {
          // Rubber-band selection
          dispatch({ type: "SET_SELECTION", ids: [] });
          dispatch({
            type: "SET_DRAG",
            drag: {
              type: "rubberband",
              startX: sx,
              startY: sy,
              currentX: sx,
              currentY: sy,
            },
          });
        }
        return;
      }

      // Eraser tool
      if (tool === "eraser") {
        const visibleElements = s.elementOrder
          .map((id) => s.elements.get(id))
          .filter((el): el is CanvasElement => !!el && !el.isDeleted);

        for (let i = visibleElements.length - 1; i >= 0; i--) {
          if (hitTest(visibleElements[i], [cx, cy], s.appState.viewport.zoom)) {
            dispatch({ type: "DELETE_ELEMENTS", ids: [visibleElements[i].id] });
            break;
          }
        }
        return;
      }

      // Drawing tools
      const elementType = toolToElementType(tool);
      if (elementType && elementType !== "text") {
        const el = createElement(elementType, cx, cy, s.appState.currentStyle);
        dispatch({ type: "ADD_ELEMENT", element: el });
        drawingElementIdRef.current = el.id;
        dispatch({
          type: "SET_DRAG",
          drag: {
            type: "draw",
            startX: cx,
            startY: cy,
            currentX: cx,
            currentY: cy,
            elementId: el.id,
          },
        });
      }

      // Text tool — handled in double-click
      if (tool === "text") {
        const el = createElement("text", cx, cy, s.appState.currentStyle);
        dispatch({ type: "ADD_ELEMENT", element: el });
        dispatch({ type: "SET_EDITING_TEXT", id: el.id });
        dispatch({ type: "SET_SELECTION", ids: [el.id] });
      }
    },
    [getCanvasPoint, getScreenPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current;
      const drag = s.appState.dragState;
      if (!drag) return;

      const [cx, cy] = getCanvasPoint(e);
      const [sx, sy] = getScreenPoint(e);

      switch (drag.type) {
        case "pan": {
          const dx = sx - drag.currentX;
          const dy = sy - drag.currentY;
          dispatch({
            type: "SET_VIEWPORT",
            viewport: {
              scrollX: s.appState.viewport.scrollX + dx,
              scrollY: s.appState.viewport.scrollY + dy,
            },
          });
          dispatch({
            type: "SET_DRAG",
            drag: { ...drag, currentX: sx, currentY: sy },
          });
          break;
        }

        case "move": {
          const dx = cx - drag.currentX;
          const dy = cy - drag.currentY;
          for (const id of s.appState.selectedIds) {
            const el = s.elements.get(id);
            if (el && !el.isDeleted && !el.locked) {
              const moved = moveElement(el, dx, dy);
              dispatch({ type: "UPDATE_ELEMENT", id, updates: moved });
            }
          }
          dispatch({
            type: "SET_DRAG",
            drag: { ...drag, currentX: cx, currentY: cy },
          });
          break;
        }

        case "resize": {
          if (!drag.elementId || !drag.handle) break;
          const el = s.elements.get(drag.elementId);
          if (!el) break;
          const dx = cx - drag.currentX;
          const dy = cy - drag.currentY;
          const resized = resizeElement(el, drag.handle, dx, dy);
          dispatch({ type: "UPDATE_ELEMENT", id: drag.elementId, updates: resized });
          dispatch({
            type: "SET_DRAG",
            drag: { ...drag, currentX: cx, currentY: cy },
          });
          break;
        }

        case "draw": {
          if (!drag.elementId) break;
          const el = s.elements.get(drag.elementId);
          if (!el) break;

          if (el.type === "freedraw") {
            const fdEl = el as FreedrawElement;
            const relX = cx - el.x;
            const relY = cy - el.y;
            dispatch({
              type: "UPDATE_ELEMENT",
              id: el.id,
              updates: {
                points: [...fdEl.points, [relX, relY] as Point],
                pressures: [...fdEl.pressures, e.pressure || 0.5],
              },
            });
          } else if (el.type === "line" || el.type === "arrow") {
            const linEl = el as LinearElement;
            const relX = cx - el.x;
            const relY = cy - el.y;
            // Update the last point (endpoint)
            const newPoints = linEl.points.length <= 1
              ? [[0, 0] as Point, [relX, relY] as Point]
              : [...linEl.points.slice(0, -1), [relX, relY] as Point];
            dispatch({
              type: "UPDATE_ELEMENT",
              id: el.id,
              updates: {
                points: newPoints,
                width: relX,
                height: relY,
              },
            });
          } else {
            // Shape tools: update width/height
            dispatch({
              type: "UPDATE_ELEMENT",
              id: el.id,
              updates: {
                width: cx - el.x,
                height: cy - el.y,
              },
            });
          }
          dispatch({
            type: "SET_DRAG",
            drag: { ...drag, currentX: cx, currentY: cy },
          });
          break;
        }

        case "rubberband": {
          dispatch({
            type: "SET_DRAG",
            drag: { ...drag, currentX: sx, currentY: sy },
          });
          break;
        }
      }
    },
    [getCanvasPoint, getScreenPoint]
  );

  const handlePointerUp = useCallback(
    () => {
      const s = stateRef.current;
      const drag = s.appState.dragState;

      if (drag?.type === "rubberband") {
        // Select elements inside the rubberband
        const v = s.appState.viewport;
        const [x1, y1] = screenToCanvas(
          Math.min(drag.startX, drag.currentX),
          Math.min(drag.startY, drag.currentY),
          v
        );
        const [x2, y2] = screenToCanvas(
          Math.max(drag.startX, drag.currentX),
          Math.max(drag.startY, drag.currentY),
          v
        );

        const visibleElements = s.elementOrder
          .map((id) => s.elements.get(id))
          .filter((el): el is CanvasElement => !!el && !el.isDeleted);

        const selected = getElementsInSelectionBox(visibleElements, {
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1,
        });

        dispatch({ type: "SET_SELECTION", ids: selected.map((el) => el.id) });
      }

      if (drag?.type === "draw" && drag.elementId) {
        const el = s.elements.get(drag.elementId);
        if (el) {
          const bb = getBoundingBox(el);
          // Remove tiny elements (accidental clicks)
          if (bb.width < 3 && bb.height < 3 && el.type !== "freedraw") {
            dispatch({ type: "DELETE_ELEMENTS", ids: [el.id] });
          } else {
            // Select the newly drawn element and reset tool to selection
            dispatch({ type: "SET_SELECTION", ids: [el.id] });
            dispatch({ type: "SET_TOOL", tool: "selection" });
          }
        }
        drawingElementIdRef.current = null;
      }

      dispatch({ type: "SET_DRAG", drag: null });
    },
    []
  );

  // ─── Wheel handler (zoom + pan) ───────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const s = stateRef.current;

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(30, Math.max(0.1, s.appState.viewport.zoom * (1 + delta)));
      const zoomRatio = newZoom / s.appState.viewport.zoom;

      dispatch({
        type: "SET_VIEWPORT",
        viewport: {
          zoom: newZoom,
          scrollX: mouseX - (mouseX - s.appState.viewport.scrollX) * zoomRatio,
          scrollY: mouseY - (mouseY - s.appState.viewport.scrollY) * zoomRatio,
        },
      });
    } else {
      // Pan
      dispatch({
        type: "SET_VIEWPORT",
        viewport: {
          scrollX: s.appState.viewport.scrollX - e.deltaX,
          scrollY: s.appState.viewport.scrollY - e.deltaY,
        },
      });
    }
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle shortcuts when editing text
      if (stateRef.current.appState.editingTextId) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const s = stateRef.current;

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        const toolMap: Record<string, ToolName> = {
          v: "selection", "1": "selection",
          r: "rectangle", "2": "rectangle",
          d: "diamond",
          o: "ellipse",
          a: "arrow",
          l: "line",
          p: "draw",
          t: "text",
          e: "eraser",
          h: "pan",
        };
        const tool = toolMap[e.key.toLowerCase()];
        if (tool) {
          dispatch({ type: "SET_TOOL", tool });
          return;
        }
      }

      // Delete
      if ((e.key === "Delete" || e.key === "Backspace") && s.appState.selectedIds.length > 0) {
        e.preventDefault();
        dispatch({ type: "DELETE_ELEMENTS", ids: s.appState.selectedIds });
        return;
      }

      // Ctrl+D — Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        if (s.appState.selectedIds.length > 0) {
          dispatch({ type: "DUPLICATE", ids: s.appState.selectedIds });
        }
        return;
      }

      // Ctrl+A — Select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const allIds = s.elementOrder.filter((id) => {
          const el = s.elements.get(id);
          return el && !el.isDeleted && !el.locked;
        });
        dispatch({ type: "SET_SELECTION", ids: allIds });
        return;
      }

      // Escape — deselect
      if (e.key === "Escape") {
        dispatch({ type: "SET_SELECTION", ids: [] });
        dispatch({ type: "SET_TOOL", tool: "selection" });
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── Double-click for text ────────────────────────────────────────────

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const [cx, cy] = screenToCanvas(
        e.clientX - canvasRef.current!.getBoundingClientRect().left,
        e.clientY - canvasRef.current!.getBoundingClientRect().top,
        stateRef.current.appState.viewport
      );

      // Check if double-clicking on an existing text element
      const s = stateRef.current;
      const visibleElements = s.elementOrder
        .map((id) => s.elements.get(id))
        .filter((el): el is CanvasElement => !!el && !el.isDeleted);

      for (let i = visibleElements.length - 1; i >= 0; i--) {
        const el = visibleElements[i];
        if (el.type === "text" && hitTest(el, [cx, cy], s.appState.viewport.zoom)) {
          dispatch({ type: "SET_EDITING_TEXT", id: el.id });
          dispatch({ type: "SET_SELECTION", ids: [el.id] });
          return;
        }
      }

      // Create new text element
      const el = createElement("text", cx, cy, s.appState.currentStyle);
      dispatch({ type: "ADD_ELEMENT", element: el });
      dispatch({ type: "SET_EDITING_TEXT", id: el.id });
      dispatch({ type: "SET_SELECTION", ids: [el.id] });
    },
    []
  );

  // ─── Style change handler ────────────────────────────────────────────

  const handleStyleChange = useCallback(
    (updates: Partial<AppState["currentStyle"]>) => {
      dispatch({ type: "SET_STYLE", style: updates });

      // Also apply to selected elements
      const s = stateRef.current;
      for (const id of s.appState.selectedIds) {
        dispatch({ type: "UPDATE_ELEMENT", id, updates: updates as Partial<CanvasElement> });
      }
    },
    []
  );

  // ─── Reorder handler ─────────────────────────────────────────────────

  const handleReorder = useCallback(
    (direction: "front" | "back" | "forward" | "backward") => {
      const s = stateRef.current;
      for (const id of s.appState.selectedIds) {
        dispatch({ type: "REORDER", id, direction });
      }
    },
    []
  );

  // ─── Zoom controls ───────────────────────────────────────────────────

  const handleZoomChange = useCallback((newZoom: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;
    const zoomRatio = newZoom / s.appState.viewport.zoom;

    dispatch({
      type: "SET_VIEWPORT",
      viewport: {
        zoom: newZoom,
        scrollX: centerX - (centerX - s.appState.viewport.scrollX) * zoomRatio,
        scrollY: centerY - (centerY - s.appState.viewport.scrollY) * zoomRatio,
      },
    });
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-950">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{
          cursor: getCursorForTool(state.appState.activeTool, state.appState.dragState),
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />

      {/* Text editor overlay */}
      {state.appState.editingTextId && (
        <TextEditorOverlay
          element={state.elements.get(state.appState.editingTextId) as CanvasElement & { type: "text" }}
          viewport={state.appState.viewport}
          onCommit={(text: string) => {
            const id = state.appState.editingTextId!;
            if (text.trim() === "") {
              dispatch({ type: "DELETE_ELEMENTS", ids: [id] });
            } else {
              dispatch({ type: "UPDATE_ELEMENT", id, updates: { text } });
            }
            dispatch({ type: "SET_EDITING_TEXT", id: null });
          }}
          onCancel={() => {
            const id = state.appState.editingTextId!;
            const el = state.elements.get(id);
            if (el && el.type === "text" && !el.text) {
              dispatch({ type: "DELETE_ELEMENTS", ids: [id] });
            }
            dispatch({ type: "SET_EDITING_TEXT", id: null });
          }}
        />
      )}

      {/* UI overlays */}
      <Toolbar
        activeTool={state.appState.activeTool}
        onToolChange={(tool) => dispatch({ type: "SET_TOOL", tool })}
      />

      <StylePanel
        currentStyle={state.appState.currentStyle}
        activeTool={state.appState.activeTool}
        hasSelection={state.appState.selectedIds.length > 0}
        onStyleChange={handleStyleChange}
        onReorder={handleReorder}
      />

      <ZoomControls
        zoom={state.appState.viewport.zoom}
        onZoomChange={handleZoomChange}
      />
    </div>
  );
}

// ─── Text Editor Overlay ──────────────────────────────────────────────────

function TextEditorOverlay({
  element,
  viewport,
  onCommit,
  onCancel,
}: {
  element: CanvasElement & { type: "text" } | undefined;
  viewport: AppState["viewport"];
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current) {
      divRef.current.focus();
      if (element?.text) {
        divRef.current.textContent = element.text;
      }
    }
  }, [element?.text]);

  if (!element) return null;

  const FONT_MAP: Record<string, string> = {
    hand: "'Caveat', cursive",
    normal: "'Inter', sans-serif",
    code: "'Fira Code', monospace",
  };

  const screenX = element.x * viewport.zoom + viewport.scrollX;
  const screenY = element.y * viewport.zoom + viewport.scrollY;

  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      className="absolute outline-none z-50"
      style={{
        left: screenX,
        top: screenY,
        minWidth: Math.max(element.width * viewport.zoom, 40),
        minHeight: element.fontSize * viewport.zoom * 1.4,
        fontSize: element.fontSize * viewport.zoom,
        fontFamily: FONT_MAP[element.fontFamily] || FONT_MAP.hand,
        color: element.strokeColor,
        lineHeight: 1.4,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        caretColor: element.strokeColor,
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
        e.stopPropagation();
      }}
      onBlur={() => {
        const text = divRef.current?.textContent || "";
        onCommit(text);
      }}
    />
  );
}

// ─── Cursor helper ────────────────────────────────────────────────────────

function getCursorForTool(tool: ToolName, drag: DragState | null): string {
  if (drag?.type === "pan") return "grabbing";
  switch (tool) {
    case "selection": return "default";
    case "pan": return "grab";
    case "text": return "text";
    case "eraser": return "crosshair";
    default: return "crosshair";
  }
}
