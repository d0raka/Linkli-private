"use client";

import {
  clampDecorationCount,
  clampDecorationSpeed,
  decorationSpeedLabel,
  DECORATION_EDGES,
  DECORATION_EDGE_LABELS,
  normalizeDecorationEdge,
  type DecorationEdge,
} from "@/lib/decoration-motion";

export function DecorationMotionControls({
  from,
  to,
  count,
  speed,
  onFrom,
  onTo,
  onCount,
  onSpeed,
}: {
  from?: string;
  to?: string;
  count?: number;
  speed?: number;
  onFrom: (value: DecorationEdge) => void;
  onTo: (value: DecorationEdge) => void;
  onCount: (value: number) => void;
  onSpeed: (value: number) => void;
}) {
  const nextFrom = normalizeDecorationEdge(from, "top");
  const nextTo = normalizeDecorationEdge(to, "bottom");
  const nextCount = clampDecorationCount(count);
  const nextSpeed = clampDecorationSpeed(speed);

  return (
    <div className="toolbox-deco-motion">
      <p className="toolbox-deco-path">
        {DECORATION_EDGE_LABELS[nextFrom]} → {DECORATION_EDGE_LABELS[nextTo]}
      </p>
      <EdgeField label="מאיפה הם מגיעים" value={nextFrom} onChange={onFrom} />
      <EdgeField label="לאן הם זזים" value={nextTo} onChange={onTo} />
      <label className="toolbox-deco-slider">
        <span>כמות <b>{nextCount}</b></span>
        <input type="range" min={4} max={24} step={1} value={nextCount} onChange={(event) => onCount(Number(event.target.value))} />
      </label>
      <label className="toolbox-deco-slider">
        <span>מהירות <b>{decorationSpeedLabel(nextSpeed)}</b></span>
        <input type="range" min={0.4} max={2.2} step={0.1} value={nextSpeed} onChange={(event) => onSpeed(Number(event.target.value))} />
      </label>
    </div>
  );
}

function EdgeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DecorationEdge;
  onChange: (value: DecorationEdge) => void;
}) {
  return (
    <div className="toolbox-deco-field">
      <b>{label}</b>
      <div className="toolbox-deco-edges">
        {DECORATION_EDGES.map((edge) => (
          <button
            key={edge}
            type="button"
            className={value === edge ? "active" : ""}
            aria-pressed={value === edge}
            onClick={() => onChange(edge)}
          >
            {DECORATION_EDGE_LABELS[edge]}
          </button>
        ))}
      </div>
    </div>
  );
}
