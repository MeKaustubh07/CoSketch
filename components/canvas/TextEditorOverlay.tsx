"use client";

import { useRef, useEffect, useCallback } from "react";
import type { CanvasElement, Viewport, FontFamily } from "@/lib/types";

const FONT_MAP: Record<FontFamily, string> = {
  hand: "'Caveat', cursive",
  normal: "'Inter', sans-serif",
  code: "'Fira Code', 'Courier New', monospace",
};

interface TextEditorOverlayProps {
  element: (CanvasElement & { type: "text" }) | undefined;
  viewport: Viewport;
  onCommit: (text: string, width: number, height: number) => void;
  onCancel: () => void;
}

export function TextEditorOverlay({
  element,
  viewport,
  onCommit,
  onCancel,
}: TextEditorOverlayProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    committedRef.current = false;
    if (divRef.current && element) {
      divRef.current.focus();
      if (element.text) {
        divRef.current.innerText = element.text;
        // Place cursor at end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(divRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [element?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;

    const text = divRef.current?.innerText || "";
    const rect = divRef.current?.getBoundingClientRect();
    const width = rect ? rect.width / viewport.zoom : 100;
    const height = rect ? rect.height / viewport.zoom : 30;
    onCommit(text, width, height);
  }, [onCommit, viewport.zoom]);

  if (!element) return null;

  const screenX = element.x * viewport.zoom + viewport.scrollX;
  const screenY = element.y * viewport.zoom + viewport.scrollY;
  const scaledFontSize = element.fontSize * viewport.zoom;

  return (
    <>
      {/* Click-outside backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation();
          commit();
        }}
      />

      {/* Editable div */}
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        className="absolute outline-none z-50 border border-indigo-500/30 rounded-sm"
        style={{
          left: screenX,
          top: screenY,
          minWidth: Math.max(
            element.autoResize ? 20 : element.width * viewport.zoom,
            20
          ),
          maxWidth: element.autoResize ? "60vw" : element.width * viewport.zoom,
          minHeight: scaledFontSize * 1.4,
          fontSize: scaledFontSize,
          fontFamily: FONT_MAP[element.fontFamily] || FONT_MAP.hand,
          color: element.strokeColor,
          lineHeight: 1.4,
          textAlign: element.textAlign,
          whiteSpace: element.autoResize ? "pre" : "pre-wrap",
          wordBreak: "break-word",
          caretColor: element.strokeColor,
          padding: "2px 4px",
          background: "rgba(0,0,0,0.3)",
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          // Allow Enter for newlines (default behaviour of contentEditable)
          e.stopPropagation(); // Prevent toolbar shortcuts
        }}
        onBlur={() => {
          // Small delay to allow click-outside handler to fire first
          setTimeout(() => {
            if (!committedRef.current) commit();
          }, 50);
        }}
        // Handle composition events for IME (CJK input)
        onCompositionStart={() => {
          // Mark that we're in composition
        }}
        onCompositionEnd={() => {
          // Composition ended, text is committed to the div
        }}
      />
    </>
  );
}
