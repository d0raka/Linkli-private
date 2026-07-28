"use client";

import type { ElementStyleKey, TemplateElementStyle } from "@/lib/templates";

export function ElementControlCard({
  icon,
  title,
  description,
  enabled,
  required = false,
  editing,
  onToggle,
  onEdit,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  required?: boolean;
  editing: boolean;
  onToggle?: (value: boolean) => void;
  onEdit: () => void;
}) {
  return <article className={`element-control-card ${enabled ? "enabled" : "disabled"} ${editing ? "editing" : ""}`}>
    <div className="element-control-main">
      <span className="element-control-icon">{icon}</span>
      <span className="element-control-copy"><b>{title}</b><small>{description}</small></span>
      {required
        ? <span className="element-required-badge">חובה</span>
        : <label className="element-switch" aria-label={`${enabled ? "הסתרת" : "הצגת"} ${title}`}><input type="checkbox" checked={enabled} onChange={(event) => onToggle?.(event.target.checked)} /><span /></label>}
    </div>
    <button type="button" className="element-style-button" onClick={onEdit} aria-expanded={editing}>
      <span>✦</span>{editing ? "סגירת עיצוב" : "עיצוב האלמנט"}
    </button>
  </article>;
}

export function ElementStyleEditor({
  elementKey,
  title,
  style,
  onChange,
  onReset,
}: {
  elementKey: ElementStyleKey;
  title: string;
  style: TemplateElementStyle;
  onChange: (patch: Partial<TemplateElementStyle>) => void;
  onReset: () => void;
}) {
  return <section className="element-style-editor" aria-label={`עיצוב ${title}`} data-element={elementKey}>
    <div className="element-style-heading">
      <div><span>עיצוב עצמאי</span><h4>{title}</h4><p>השינויים כאן משפיעים רק על האלמנט הזה ומופיעים מיד בתצוגה.</p></div>
      <button type="button" onClick={onReset}>איפוס</button>
    </div>

    <div className="element-color-row">
      <label><span>רקע</span><input type="color" value={style.background} onChange={(event) => onChange({ background: event.target.value })} /><code>{style.background}</code></label>
      <label><span>טקסט</span><input type="color" value={style.color} onChange={(event) => onChange({ color: event.target.value })} /><code>{style.color}</code></label>
      <label><span>הדגשה</span><input type="color" value={style.accent} onChange={(event) => onChange({ accent: event.target.value })} /><code>{style.accent}</code></label>
    </div>

    <div className="element-range-row">
      <label><span><b>גודל</b><strong>{style.size}%</strong></span><input type="range" min={80} max={130} step={5} value={style.size} onChange={(event) => onChange({ size: Number(event.target.value) })} /></label>
      <label><span><b>עיגול פינות</b><strong>{style.radius}px</strong></span><input type="range" min={0} max={40} step={2} value={style.radius} onChange={(event) => onChange({ radius: Number(event.target.value) })} /></label>
    </div>

    <div className="element-align-row">
      <span>יישור תוכן</span>
      <div role="group" aria-label={`יישור ${title}`}>
        {([
          ["right", "ימין"],
          ["center", "מרכז"],
          ["left", "שמאל"],
        ] as const).map(([value, label]) => <button type="button" key={value} className={style.align === value ? "active" : ""} aria-pressed={style.align === value} onClick={() => onChange({ align: value })}>{label}</button>)}
      </div>
    </div>
  </section>;
}
