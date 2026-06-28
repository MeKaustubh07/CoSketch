/* eslint-disable react-hooks/refs */
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
  toolToElementType,
} from "@/lib/scene";
import { measureText } from "@/lib/text";
import type {
  CanvasElement,
  AppState,
  DragState,
  ToolName,
  Point,
  FreedrawElement,
  LinearElement,
  TextElement,
} from "@/lib/types";
import { DEFAULT_STYLE } from "@/lib/types";
import { Toolbar } from "./Toolbar";
import { StylePanel } from "./StylePanel";
import { ZoomControls } from "./ZoomControls";
import { TextEditorOverlay } from "./TextEditorOverlay";
import { ExportMenu } from "./ExportMenu";
import { downloadPNG } from "@/lib/export";
import { useRealtimeActions, useOtherUsers } from "@/lib/realtime/provider";

// ─── Local UI state (everything per-user; shared scene lives in WS store) ───

type AppAction =
  | { type: "SET_TOOL"; tool: ToolName }
  | { type: "SET_SELECTION"; ids: string[] }
  | { type: "SET_VIEWPORT"; viewport: Partial<AppState["viewport"]> }
  | { type: "SET_EDITING_TEXT"; id: string | null }
  | { type: "SET_STYLE"; style: Partial<AppState["currentStyle"]> };

type UIState = Pick<
  AppState,
  "viewport" | "activeTool" | "selectedIds" | "editingTextId" | "currentStyle"
>;

const initialUI: UIState = {
  viewport: { scrollX: 0, scrollY: 0, zoom: 1 },
  activeTool: "selection",
  selectedIds: [],
  editingTextId: null,
  currentStyle: { ...DEFAULT_STYLE },
};

function uiReducer(state: UIState, action: AppAction): UIState {
  switch (action.type) {
    case "SET_TOOL":
      return { ...state, activeTool: action.tool, selectedIds: [] };
    case "SET_SELECTION":
      return { ...state, selectedIds: action.ids };
    case "SET_VIEWPORT":
      return { ...state, viewport: { ...state.viewport, ...action.viewport } };
    case "SET_EDITING_TEXT":
      return { ...state, editingTextId: action.id };
    case "SET_STYLE":
      return { ...state, currentStyle: { ...state.currentStyle, ...action.style } };
    default:
      return state;
  }
}

const FLUSH_MS = 60; // throttle storage writes during a drag

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RoughRenderer | null>(null);
  const [ui, dispatch] = useReducer(uiReducer, initialUI);

  // ─── Shared scene (custom WS store) ─────────────────────────────────────
  const { store, sendUpsert, sendDelete, sendReorder, sendPresence } = useRealtimeActions();
  const others = useOtherUsers();

  // Refs kept fresh for the imperative rAF render loop + event handlers.
  const uiRef = useRef(ui);
  const dragRef = useRef<DragState | null>(null);
  const overrideRef = useRef<Map<string, CanvasElement>>(new Map());
  const lastFlushRef = useRef(0);
  const lastPresenceRef = useRef(0);
  const dirtyRef = useRef(true);

  uiRef.current = ui;

  // Mark dirty when store or UI changes
  useEffect(() => {
    const unsub = store.subscribe(() => {
      dirtyRef.current = true;
    });
    return unsub;
  }, [store]);

  useEffect(() => {
    dirtyRef.current = true;
  }, [ui]);

  // ─── Element access (merge store + in-flight overrides) ─────────────────

  const currentElements = useCallback((): Map<string, CanvasElement> => {
    const m = new Map(store.getElements());
    for (const [k, v] of overrideRef.current) m.set(k, v);
    return m;
  }, [store]);

  const currentOrder = useCallback(
    (): string[] => [...store.getElementOrder()],
    [store]
  );

  const visibleInZOrder = useCallback((): CanvasElement[] => {
    const els = currentElements();
    return currentOrder()
      .map((id) => els.get(id))
      .filter((el): el is CanvasElement => !!el && !el.isDeleted);
  }, [currentElements, currentOrder]);

  // Flush in-flight overrides — sends WS ops for each overridden element.
  const flushOverrides = useCallback(() => {
    const ov = overrideRef.current;
    if (ov.size === 0) return;
    for (const [, el] of ov) {
      sendUpsert(el);
    }
    lastFlushRef.current = performance.now();
  }, [sendUpsert]);

  // Patch elements locally + send ops
  const commitPatches = useCallback(
    (patches: Array<[string, Partial<CanvasElement>]>) => {
      for (const [id, patch] of patches) {
        const el = store.getElement(id) ?? overrideRef.current.get(id);
        if (el) {
          const updated = { ...el, ...patch, version: el.version + 1 } as CanvasElement;
          sendUpsert(updated);
        }
      }
    },
    [store, sendUpsert]
  );

  // Add element to store + send op
  const addElement = useCallback(
    (el: CanvasElement) => {
      sendUpsert(el);
    },
    [sendUpsert]
  );

  // Add many elements
  const addMany = useCallback(
    (els: CanvasElement[]) => {
      for (const el of els) sendUpsert(el);
    },
    [sendUpsert]
  );

  // Remove elements
  const removeElements = useCallback(
    (ids: string[]) => {
      for (const id of ids) sendDelete(id);
    },
    [sendDelete]
  );

  // Reorder
  const reorder = useCallback(
    (id: string, direction: "front" | "back" | "forward" | "backward") => {
      sendReorder(id, direction);
    },
    [sendReorder]
  );

  const setOverride = useCallback((el: CanvasElement) => {
    overrideRef.current.set(el.id, el);
    dirtyRef.current = true;
  }, []);

  // ─── Canvas setup + rAF loop ────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rendererRef.current = new RoughRenderer(canvas);

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      dirtyRef.current = true;
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let rafId: number;
    function loop() {
      if (dirtyRef.current && rendererRef.current && canvas) {
        const ui = uiRef.current;
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;

        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          // Build elements map with overrides for rendering
          const els = new Map(store.getElements());
          for (const [k, v] of overrideRef.current) els.set(k, v);
          const order = store.getElementOrder();

          rendererRef.current.render(
            els,
            order,
            ui.viewport,
            ui.selectedIds,
            ui.editingTextId,
            cssW,
            cssH
          );

          // Rubber-band overlay (screen space)
          const drag = dragRef.current;
          if (drag?.type === "rubberband") {
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.strokeStyle = "#6965db";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.fillStyle = "rgba(105, 101, 219, 0.08)";
            const x = Math.min(drag.startX, drag.currentX);
            const y = Math.min(drag.startY, drag.currentY);
            ctx.fillRect(x, y, Math.abs(drag.currentX - drag.startX), Math.abs(drag.currentY - drag.startY));
            ctx.strokeRect(x, y, Math.abs(drag.currentX - drag.startX), Math.abs(drag.currentY - drag.startY));
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
  }, [store]);

  // ─── Coordinate helpers ──────────────────────────────────────────────────

  const getCanvasPoint = useCallback((e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, uiRef.current.viewport);
  }, []);

  const getScreenPoint = useCallback((e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }, []);

  // ─── Pointer down ─────────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Pointer may not be capturable — non-fatal.
      }

      const ui = uiRef.current;
      const [cx, cy] = getCanvasPoint(e);
      const [sx, sy] = getScreenPoint(e);
      const tool = ui.activeTool;

      if (tool === "pan" || e.button === 1) {
        dragRef.current = { type: "pan", startX: sx, startY: sy, currentX: sx, currentY: sy };
        canvas.style.cursor = "grabbing";
        return;
      }

      const els = currentElements();

      if (tool === "selection") {
        // Handle hit (single selection only)
        if (ui.selectedIds.length === 1) {
          const sel = els.get(ui.selectedIds[0]);
          if (sel && !sel.isDeleted) {
            const handle = getHitHandle([cx, cy], sel, ui.viewport.zoom);
            if (handle) {
              dragRef.current = {
                type: handle.type === "rotate" ? "rotate" : "resize",
                startX: cx,
                startY: cy,
                currentX: cx,
                currentY: cy,
                handle: handle.type,
                elementId: sel.id,
              };
              return;
            }
          }
        }

        // Hit-test top-most element
        const visible = currentOrder()
          .map((id) => els.get(id))
          .filter((el): el is CanvasElement => !!el && !el.isDeleted);
        let hit: CanvasElement | null = null;
        for (let i = visible.length - 1; i >= 0; i--) {
          if (hitTest(visible[i], [cx, cy], ui.viewport.zoom)) {
            hit = visible[i];
            break;
          }
        }

        if (hit) {
          const already = ui.selectedIds.includes(hit.id);
          if (e.shiftKey) {
            dispatch({
              type: "SET_SELECTION",
              ids: already
                ? ui.selectedIds.filter((id) => id !== hit!.id)
                : [...ui.selectedIds, hit.id],
            });
          } else if (!already) {
            dispatch({ type: "SET_SELECTION", ids: [hit.id] });
          }
          dragRef.current = { type: "move", startX: cx, startY: cy, currentX: cx, currentY: cy };
        } else {
          dispatch({ type: "SET_SELECTION", ids: [] });
          dragRef.current = { type: "rubberband", startX: sx, startY: sy, currentX: sx, currentY: sy };
        }
        return;
      }

      if (tool === "eraser") {
        const visible = currentOrder()
          .map((id) => els.get(id))
          .filter((el): el is CanvasElement => !!el && !el.isDeleted);
        for (let i = visible.length - 1; i >= 0; i--) {
          if (hitTest(visible[i], [cx, cy], ui.viewport.zoom)) {
            removeElements([visible[i].id]);
            break;
          }
        }
        return;
      }

      if (tool === "text") {
        const el = createTextAt(cx, cy, ui.currentStyle);
        addElement(el);
        // Return to selection so the text can be moved/edited right after.
        dispatch({ type: "SET_TOOL", tool: "selection" });
        dispatch({ type: "SET_SELECTION", ids: [el.id] });
        dispatch({ type: "SET_EDITING_TEXT", id: el.id });
        return;
      }

      // Drawing tools
      const elementType = toolToElementType(tool);
      if (elementType && elementType !== "text") {
        const el = createElement(elementType, cx, cy, ui.currentStyle);
        addElement(el);
        setOverride(el);
        dragRef.current = {
          type: "draw",
          startX: cx,
          startY: cy,
          currentX: cx,
          currentY: cy,
          elementId: el.id,
        };
      }
    },
    [getCanvasPoint, getScreenPoint, currentElements, currentOrder, addElement, removeElements, setOverride]
  );

  // ─── Pointer move ─────────────────────────────────────────────────────────

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ui = uiRef.current;
      const [cx, cy] = getCanvasPoint(e);
      const [sx, sy] = getScreenPoint(e);

      // Broadcast cursor (canvas coords), throttled.
      const now = performance.now();
      if (now - lastPresenceRef.current > 40) {
        sendPresence({ cursor: { x: cx, y: cy }, name: "", color: "" });
        lastPresenceRef.current = now;
      }

      const drag = dragRef.current;
      if (!drag) return;

      // Per-element lookup
      const getEl = (id: string): CanvasElement | undefined =>
        overrideRef.current.get(id) ?? store.getElement(id);

      switch (drag.type) {
        case "pan": {
          dispatch({
            type: "SET_VIEWPORT",
            viewport: {
              scrollX: ui.viewport.scrollX + (sx - drag.currentX),
              scrollY: ui.viewport.scrollY + (sy - drag.currentY),
            },
          });
          drag.currentX = sx;
          drag.currentY = sy;
          break;
        }

        case "move": {
          const dx = cx - drag.currentX;
          const dy = cy - drag.currentY;
          for (const id of ui.selectedIds) {
            const el = getEl(id);
            if (el && !el.isDeleted && !el.locked) setOverride(moveElement(el, dx, dy));
          }
          drag.currentX = cx;
          drag.currentY = cy;
          break;
        }

        case "resize": {
          if (!drag.elementId || !drag.handle) break;
          const el = getEl(drag.elementId);
          if (!el) break;
          setOverride(resizeElement(el, drag.handle, cx - drag.currentX, cy - drag.currentY));
          drag.currentX = cx;
          drag.currentY = cy;
          break;
        }

        case "rotate": {
          if (!drag.elementId) break;
          const el = getEl(drag.elementId);
          if (!el) break;
          const bb = getBoundingBox(el);
          const centerX = bb.x + bb.width / 2;
          const centerY = bb.y + bb.height / 2;
          const angle = Math.atan2(cy - centerY, cx - centerX) + Math.PI / 2;
          setOverride({ ...el, angle, version: el.version + 1 });
          break;
        }

        case "draw": {
          if (!drag.elementId) break;
          const el = getEl(drag.elementId);
          if (!el) break;
          if (el.type === "freedraw") {
            const fd = el as FreedrawElement;
            setOverride({
              ...fd,
              points: [...fd.points, [cx - el.x, cy - el.y] as Point],
              pressures: [...fd.pressures, e.pressure || 0.5],
            });
          } else if (el.type === "line" || el.type === "arrow") {
            const lin = el as LinearElement;
            const rx = cx - el.x;
            const ry = cy - el.y;
            const pts: Point[] =
              lin.points.length <= 1 ? [[0, 0], [rx, ry]] : [...lin.points.slice(0, -1), [rx, ry]];
            setOverride({ ...lin, points: pts, width: rx, height: ry });
          } else {
            setOverride({ ...el, width: cx - el.x, height: cy - el.y });
          }
          drag.currentX = cx;
          drag.currentY = cy;
          break;
        }

        case "rubberband": {
          drag.currentX = sx;
          drag.currentY = sy;
          dirtyRef.current = true;
          break;
        }
      }

      // Throttled storage sync so collaborators see the drag live.
      if (drag.type !== "rubberband" && drag.type !== "pan") {
        if (performance.now() - lastFlushRef.current > FLUSH_MS) flushOverrides();
      }
    },
    [getCanvasPoint, getScreenPoint, sendPresence, store, setOverride, flushOverrides]
  );

  // ─── Pointer up ───────────────────────────────────────────────────────────

  const handlePointerUp = useCallback(() => {
    const ui = uiRef.current;
    const drag = dragRef.current;
    dragRef.current = null;

    if (canvasRef.current) {
      canvasRef.current.style.cursor = getCursorForTool(ui.activeTool);
    }

    if (drag?.type === "rubberband") {
      const v = ui.viewport;
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
      const selected = getElementsInSelectionBox(visibleInZOrder(), {
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
      });
      dispatch({ type: "SET_SELECTION", ids: selected.map((el) => el.id) });
      dirtyRef.current = true;
      return;
    }

    if (drag?.type === "draw" && drag.elementId) {
      const el = overrideRef.current.get(drag.elementId);
      if (el) {
        const bb = getBoundingBox(el);
        if (bb.width < 3 && bb.height < 3 && el.type !== "freedraw") {
          overrideRef.current.delete(el.id);
          removeElements([el.id]);
        } else {
          flushOverrides();
          dispatch({ type: "SET_SELECTION", ids: [el.id] });
          dispatch({ type: "SET_TOOL", tool: "selection" });
        }
      }
      overrideRef.current.clear();
      dirtyRef.current = true;
      return;
    }

    // move / resize / rotate
    if (drag) {
      flushOverrides();
      overrideRef.current.clear();
      dirtyRef.current = true;
    }
  }, [visibleInZOrder, flushOverrides, removeElements]);

  const handlePointerLeave = useCallback(() => {
    sendPresence({ cursor: null, name: "", color: "" });
  }, [sendPresence]);

  // ─── Wheel (zoom + pan) ────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const ui = uiRef.current;
    if (e.ctrlKey || e.metaKey) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(30, Math.max(0.1, ui.viewport.zoom * (1 + delta)));
      const ratio = newZoom / ui.viewport.zoom;
      dispatch({
        type: "SET_VIEWPORT",
        viewport: {
          zoom: newZoom,
          scrollX: mx - (mx - ui.viewport.scrollX) * ratio,
          scrollY: my - (my - ui.viewport.scrollY) * ratio,
        },
      });
    } else {
      dispatch({
        type: "SET_VIEWPORT",
        viewport: {
          scrollX: ui.viewport.scrollX - e.deltaX,
          scrollY: ui.viewport.scrollY - e.deltaY,
        },
      });
    }
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────

  const duplicateSelected = useCallback(
    (ids: string[]) => {
      const els = currentElements();
      const dups: CanvasElement[] = [];
      for (const id of ids) {
        const el = els.get(id);
        if (el && !el.isDeleted) dups.push(duplicateElement(el));
      }
      if (dups.length === 0) return;
      addMany(dups);
      dispatch({ type: "SET_SELECTION", ids: dups.map((d) => d.id) });
    },
    [currentElements, addMany]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (uiRef.current.editingTextId) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ui = uiRef.current;

      if (!e.ctrlKey && !e.metaKey) {
        const map: Record<string, ToolName> = {
          v: "selection", "1": "selection",
          r: "rectangle", "2": "rectangle",
          d: "diamond", o: "ellipse", a: "arrow", l: "line",
          p: "draw", t: "text", e: "eraser", h: "pan",
        };
        const tool = map[e.key.toLowerCase()];
        if (tool) {
          dispatch({ type: "SET_TOOL", tool });
          return;
        }
      }

      if ((e.key === "Delete" || e.key === "Backspace") && ui.selectedIds.length > 0) {
        e.preventDefault();
        removeElements(ui.selectedIds);
        dispatch({ type: "SET_SELECTION", ids: [] });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        if (ui.selectedIds.length > 0) duplicateSelected(ui.selectedIds);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const ids = visibleInZOrder().filter((el) => !el.locked).map((el) => el.id);
        dispatch({ type: "SET_SELECTION", ids });
        return;
      }
      if (e.key === "Escape") {
        dispatch({ type: "SET_SELECTION", ids: [] });
        dispatch({ type: "SET_TOOL", tool: "selection" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeElements, visibleInZOrder]);

  // ─── Double-click (text) ───────────────────────────────────────────────────

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const [cx, cy] = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, uiRef.current.viewport);
      const ui = uiRef.current;
      const visible = visibleInZOrder();

      for (let i = visible.length - 1; i >= 0; i--) {
        const el = visible[i];
        if (el.type === "text" && hitTest(el, [cx, cy], ui.viewport.zoom)) {
          dispatch({ type: "SET_EDITING_TEXT", id: el.id });
          dispatch({ type: "SET_SELECTION", ids: [el.id] });
          return;
        }
      }

      const el = createTextAt(cx, cy, ui.currentStyle);
      addElement(el);
      dispatch({ type: "SET_TOOL", tool: "selection" });
      dispatch({ type: "SET_SELECTION", ids: [el.id] });
      dispatch({ type: "SET_EDITING_TEXT", id: el.id });
    },
    [visibleInZOrder, addElement]
  );

  // ─── Style + reorder + zoom handlers ───────────────────────────────────────

  const handleStyleChange = useCallback(
    (updates: Partial<AppState["currentStyle"]>) => {
      dispatch({ type: "SET_STYLE", style: updates });
      const ui = uiRef.current;
      if (ui.selectedIds.length > 0) {
        const patches: Array<[string, Partial<CanvasElement>]> = ui.selectedIds.map((id) => [
          id,
          updates as Partial<CanvasElement>,
        ]);
        commitPatches(patches);
      }
    },
    [commitPatches]
  );

  const handleReorder = useCallback(
    (direction: "front" | "back" | "forward" | "backward") => {
      for (const id of uiRef.current.selectedIds) reorder(id, direction);
    },
    [reorder]
  );

  const handleZoomChange = useCallback((newZoom: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ui = uiRef.current;
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const ratio = newZoom / ui.viewport.zoom;
    dispatch({
      type: "SET_VIEWPORT",
      viewport: {
        zoom: newZoom,
        scrollX: cx - (cx - ui.viewport.scrollX) * ratio,
        scrollY: cy - (cy - ui.viewport.scrollY) * ratio,
      },
    });
  }, []);

  // ─── Derived selection info ────────────────────────────────────────────────
  const lookup = (id: string): CanvasElement | undefined =>
    overrideRef.current.get(id) ?? store.getElement(id);
  const selectionHasText = ui.selectedIds.some((id) => lookup(id)?.type === "text");
  const selectionHasLinear = ui.selectedIds.some((id) => {
    const t = lookup(id)?.type;
    return t === "line" || t === "arrow";
  });
  const editingEl = ui.editingTextId
    ? (lookup(ui.editingTextId) as (CanvasElement & { type: "text" }) | undefined)
    : undefined;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: getCursorForTool(ui.activeTool),
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />

      {/* Live collaborator cursors */}
      {others.map((peer) => {
        if (!peer.presence.cursor) return null;
        const x = peer.presence.cursor.x * ui.viewport.zoom + ui.viewport.scrollX;
        const y = peer.presence.cursor.y * ui.viewport.zoom + ui.viewport.scrollY;
        return (
          <div
            key={peer.actorId}
            className="pointer-events-none absolute z-30 will-change-transform"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <svg width="20" height="28" viewBox="0 0 24 36" fill="none" className="drop-shadow">
              <path
                d="M5.65 12.37H5.46l-.14.13L.5 16.88V1.2l11.28 11.17H5.65Z"
                fill={peer.presence.color || "#6965db"}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            <div
              className="absolute left-4 top-3 px-1.5 py-0.5 rounded text-[11px] text-white font-medium whitespace-nowrap shadow"
              style={{ backgroundColor: peer.presence.color || "#6965db" }}
            >
              {peer.presence.name || "Guest"}
            </div>
          </div>
        );
      })}

      {editingEl && (
        <TextEditorOverlay
          element={editingEl}
          viewport={ui.viewport}
          onCommit={(text) => {
            const id = ui.editingTextId!;
            if (text.trim() === "") {
              removeElements([id]);
            } else {
              const { width, height } = measureText(text, editingEl.fontSize, editingEl.fontFamily);
              commitPatches([[id, { text, width, height }]]);
            }
            dispatch({ type: "SET_EDITING_TEXT", id: null });
          }}
          onCancel={() => {
            const id = ui.editingTextId!;
            if (!editingEl.text) removeElements([id]);
            dispatch({ type: "SET_EDITING_TEXT", id: null });
          }}
        />
      )}

      <Toolbar activeTool={ui.activeTool} onToolChange={(tool) => dispatch({ type: "SET_TOOL", tool })} />

      <StylePanel
        currentStyle={ui.currentStyle}
        activeTool={ui.activeTool}
        hasSelection={ui.selectedIds.length > 0}
        showText={selectionHasText}
        showArrowheads={selectionHasLinear}
        onStyleChange={handleStyleChange}
        onReorder={handleReorder}
      />

      <ZoomControls zoom={ui.viewport.zoom} onZoomChange={handleZoomChange} />

      <ExportMenu
        onExportPNG={() => {
          const canvas = canvasRef.current;
          if (canvas) {
            downloadPNG(canvas, currentElements(), currentOrder(), uiRef.current.viewport);
          }
        }}
      />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createTextAt(x: number, y: number, style: AppState["currentStyle"]): TextElement {
  const el = createElement("text", x, y, style) as TextElement;
  el.y = y - el.fontSize / 2;
  return el;
}

function getCursorForTool(tool: ToolName): string {
  switch (tool) {
    case "selection": return "default";
    case "pan": return "grab";
    case "text": return "text";
    default: return "crosshair";
  }
}
