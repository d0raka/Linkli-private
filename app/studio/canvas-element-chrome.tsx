"use client";

import { useLayoutEffect, useState } from "react";
import { type ResizeHandle } from "@/lib/element-layout";

export type CanvasTransformHandle = ResizeHandle | "rotate";

const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_LABELS: Record<CanvasTransformHandle, string> = {
  nw: "שינוי גודל מהפינה השמאלית העליונה",
  n: "שינוי גובה מלמעלה",
  ne: "שינוי גודל מהפינה הימנית העליונה",
  e: "שינוי רוחב מימין",
  se: "שינוי גודל מהפינה הימנית התחתונה",
  s: "שינוי גובה מלמטה",
  sw: "שינוי גודל מהפינה השמאלית התחתונה",
  w: "שינוי רוחב משמאל",
  rotate: "סיבוב האלמנט",
};

export function CanvasElementChrome({
  frame,
  elementKey,
  label,
  canDelete,
  locked = false,
  hidden,
  version,
  rotate = 0,
  onDelete,
  onTransformStart,
  onTransformMove,
  onTransformEnd,
  onKeyboardAction,
}: {
  frame: HTMLElement | null;
  elementKey: string;
  label: string;
  canDelete: boolean;
  locked?: boolean;
  hidden?: boolean;
  version?: string;
  rotate?: number;
  onDelete: () => void;
  onTransformStart: (handle: CanvasTransformHandle, event: React.PointerEvent<HTMLButtonElement>) => void;
  onTransformMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onTransformEnd: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onKeyboardAction?: (input: { key: string; shiftKey: boolean }) => string | null;
}) {
  const [measuredBox, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  // While hidden or detached there is nothing to draw; the layout effect re-measures before paint
  // whenever the chrome becomes visible again, so a stale measurement is never shown.
  const box = frame && !hidden ? measuredBox : null;

  useLayoutEffect(() => {
    if (!frame || hidden) return;
    const root: HTMLElement = frame;

    function sync() {
      const node = visiblePreviewElement(root, elementKey);
      if (!node) {
        setBox(null);
        return;
      }
      const area = root.getBoundingClientRect();
      const rect = visualElementRect(node);
      const cx = rect.left + rect.width / 2 - area.left + root.scrollLeft;
      const cy = rect.top + rect.height / 2 - area.top + root.scrollTop;
      const size = visualUnrotatedSize(node, rect, rotate);
      const next = {
        left: cx - size.width / 2,
        top: cy - size.height / 2,
        width: size.width,
        height: size.height,
      };
      setBox((prev) => (
        prev
        && Math.abs(prev.left - next.left) < 0.5
        && Math.abs(prev.top - next.top) < 0.5
        && Math.abs(prev.width - next.width) < 0.5
        && Math.abs(prev.height - next.height) < 0.5
          ? prev
          : next
      ));
    }

    sync();
    const node = visiblePreviewElement(root, elementKey);
    const scrollRoots = scrollableAncestors(node ?? root);
    scrollRoots.forEach((el) => el.addEventListener("scroll", sync, { passive: true }));
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const observer = new ResizeObserver(sync);
    observer.observe(root);
    root.querySelectorAll<HTMLElement>(`.preview-el-${elementKey}`).forEach((item) => observer.observe(item));
    let raf = 0;
    function tick() {
      sync();
      raf = window.requestAnimationFrame(tick);
    }
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      scrollRoots.forEach((el) => el.removeEventListener("scroll", sync));
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      observer.disconnect();
    };
  }, [frame, elementKey, hidden, label, version, rotate, locked]);

  if (!box) return null;

  function bindHandle(handle: CanvasTransformHandle) {
    return {
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        onTransformStart(handle, event);
      },
      onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        event.preventDefault();
        onTransformMove(event);
      },
      onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        onTransformEnd(event);
      },
      onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => {
        onTransformEnd(event);
      },
    };
  }

  return (
    <div
      className={`canvas-el-chrome${locked ? " is-locked" : ""}`}
      tabIndex={locked ? undefined : 0}
      role="group"
      aria-label={`${label}. חיצים להזזה, Shift וחיצים לשינוי גודל, סוגריים לסיבוב`}
      onKeyDown={(event) => {
        if (locked || !onKeyboardAction) return;
        if (event.key === "Tab") return;
        const announcement = onKeyboardAction({ key: event.key, shiftKey: event.shiftKey });
        if (announcement == null) return;
        event.preventDefault();
        event.stopPropagation();
        setLiveMessage(announcement);
      }}
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        transform: rotate && !locked ? `rotate(${rotate}deg)` : undefined,
        transformOrigin: "center center",
      }}
    >
      <span className="sr-only" aria-live="polite">{liveMessage}</span>
      {locked ? null : (
        <>
          <i className="canvas-el-rotate-stem" aria-hidden="true" />
          <button type="button" className="canvas-el-rotate" aria-label={HANDLE_LABELS.rotate} title="סיבוב" {...bindHandle("rotate")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 8V4h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19.2 12A7.2 7.2 0 1 1 16.4 5.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          {rotate ? (
            <span className="canvas-el-angle" style={rotate ? { transform: `translateX(-50%) rotate(${-rotate}deg)` } : undefined}>
              {Math.round(rotate)}°
            </span>
          ) : null}
          {RESIZE_HANDLES.map((handle) => (
            <button
              key={handle}
              type="button"
              className={`canvas-el-handle ${handle}`}
              aria-label={HANDLE_LABELS[handle]}
              title="שינוי גודל"
              {...bindHandle(handle)}
            />
          ))}
        </>
      )}
      <div className="canvas-el-toolbar" style={rotate && !locked ? { transform: `translateY(-100%) rotate(${-rotate}deg)` } : undefined}>
        <b>{label}</b>
        {canDelete ? (
          <button type="button" onClick={onDelete} aria-label={`מחיקת ${label}`} title="מחיקה">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 7h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10 7V5.4A1.4 1.4 0 0 1 11.4 4h1.2A1.4 1.4 0 0 1 14 5.4V7" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M7.2 7 8 18.4A1.6 1.6 0 0 0 9.6 20h4.8a1.6 1.6 0 0 0 1.6-1.6L16.8 7" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function scrollableAncestors(node: HTMLElement | null) {
  const parents: HTMLElement[] = [];
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const style = getComputedStyle(el);
    const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`;
    if (/(auto|scroll|overlay|hidden)/.test(overflow)) parents.push(el);
  }
  return parents;
}

function visiblePreviewElement(root: HTMLElement, elementKey: string) {
  const nodes = [...root.querySelectorAll<HTMLElement>(`.preview-el-${elementKey}`)];
  const visible = nodes.filter((node) => {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
  });
  return visible.find((node) => node.closest(".preview-site-screen, .preview-site-flow")) || visible[0] || nodes[0] || null;
}

function visualElementRect(node: HTMLElement) {
  return node.getBoundingClientRect();
}

function visualUnrotatedSize(node: HTMLElement, aabb: DOMRect, rotate: number) {
  if (!rotate) return { width: aabb.width, height: aabb.height };
  const zoomRaw = getComputedStyle(node).zoom;
  const zoom = zoomRaw && zoomRaw !== "normal" ? Number(zoomRaw) || 1 : 1;
  return { width: node.offsetWidth * zoom, height: node.offsetHeight * zoom };
}
