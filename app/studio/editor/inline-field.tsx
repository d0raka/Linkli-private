"use client";

import { useEffect, useRef, type CSSProperties } from "react";

export function readInlineText(node: HTMLElement, maxLength: number, trim: boolean, multiline: boolean) {
  const raw = (node.innerText || node.textContent || "").replace(/\u00a0/g, " ");
  const withoutBreak = multiline ? raw.replace(/\n$/, "") : raw.replace(/\n/g, "");
  const next = trim ? withoutBreak.trim() : withoutBreak;
  return Array.from(next).slice(0, maxLength).join("");
}

export function InlineField({
  value,
  onChange,
  maxLength = 200,
  multiline = false,
  className = "",
  style,
  placeholder = "לחצו לעריכה",
  as: Tag = "span",
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  as?: "span" | "p" | "h2" | "h3" | "b" | "small" | "label";
}) {
  const ref = useRef<HTMLElement>(null);
  const focused = useRef(false);
  const empty = !(value || "").trim();

  useEffect(() => {
    if (!focused.current && ref.current && ref.current.textContent !== (value || "")) {
      ref.current.textContent = value || "";
    }
  }, [value]);

  return (
    <Tag
      ref={ref as never}
      className={`inline-edit ${empty ? "is-empty" : ""} ${className}`.trim()}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      role="textbox"
      aria-label={placeholder}
      aria-multiline={multiline}
      onFocus={() => { focused.current = true; }}
      onMouseDown={(event) => {
        if (focused.current) event.stopPropagation();
      }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        focused.current = true;
        event.currentTarget.focus();
      }}
      onInput={(event) => {
        onChange(readInlineText(event.currentTarget, maxLength, false, multiline));
      }}
      onBlur={(event) => {
        focused.current = false;
        onChange(readInlineText(event.currentTarget, maxLength, true, multiline));
      }}
      onKeyDown={(event) => {
        if (event.key === "Backspace" || event.key === "Delete") event.stopPropagation();
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.currentTarget.textContent = value;
          event.currentTarget.blur();
        }
      }}
    />
  );
}
