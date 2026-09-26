"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Disclosure menu: a real button toggles a list of links/actions placed right after it in
 * source order. Closes on Escape, outside click, and after an item is chosen.
 */
export function Menu({ trigger, label, children, className = "" }: { trigger: ReactNode; label: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`ui-menu ${className}`.trim()} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="ui-menu__trigger"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>
      {open ? (
        <div className="ui-menu__popover" id={id} onClick={(event) => { if ((event.target as HTMLElement).closest("a, button")) setOpen(false); }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
