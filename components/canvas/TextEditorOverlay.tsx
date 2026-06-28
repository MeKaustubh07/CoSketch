"use client";

import { useRef, useEffect, useCallback } from "react";
import type { CanvasElement, Viewport } from "@/lib/types";
import { FONT_MAP, LINE_HEIGHT } from "@/lib/text";

interface TextEditorOverlayProps {
  element: (CanvasElement & { type: "text" }) | undefined;
  viewport: Viewport;
  onCommit: (text: string) => void;
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
    const div = divRef.current;
    if (!div || !element) return;
    if (element.text) div.innerText = element.text;
    div.focus();
    // Caret to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(div);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [element?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(divRef.current?.innerText ?? "");
  }, [onCommit]);

  if (!element) return null;

  const screenX = element.x * viewport.zoom + viewport.scrollX;
  const screenY = element.y * viewport.zoom + viewport.scrollY;
  const fontPx = element.fontSize * viewport.zoom;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onPointerDown={(e) => {
          e.stopPropagation();
          commit();
        }}
      />
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className="absolute z-50 outline-none"
        style={{
          left: screenX,
          top: screenY,
          minWidth: 4,
          fontSize: fontPx,
          fontFamily: FONT_MAP[element.fontFamily] || FONT_MAP.hand,
          color: element.strokeColor,
          lineHeight: LINE_HEIGHT,
          textAlign: element.textAlign,
          whiteSpace: "pre",
          caretColor: element.strokeColor,
          background: "transparent",
          padding: 0,
          margin: 0,
          transformOrigin: "left top",
          opacity: element.opacity / 100,
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={() => {
          setTimeout(() => {
            if (!committedRef.current) commit();
          }, 0);
        }}
      />
    </>
  );
}
