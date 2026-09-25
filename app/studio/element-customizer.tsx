"use client";

import { CENTERED_COPY_KEYS, isTextLayoutKey } from "@/lib/element-layout";
import type { PlanFeatureId, PlanType } from "@/lib/plans";
import type { ElementStyleKey, TemplateElementStyle } from "@/lib/templates";
import { PlanLockLayer } from "./plan-lock";

export function ElementControlCard({
  icon,
  title,
  description,
  enabled,
  required = false,
  editing,
  onToggle,
  onEdit,
  lockedFeature,
  plan,
  onUnlock,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  required?: boolean;
  editing: boolean;
  onToggle?: (value: boolean) => void;
  onEdit: () => void;
  lockedFeature?: PlanFeatureId;
  plan?: PlanType | string | null;
  onUnlock?: (feature: PlanFeatureId) => void;
}) {
  const card = <article className={`element-control-card ${enabled ? "enabled" : "disabled"} ${editing ? "editing" : ""} ${lockedFeature ? "is-locked" : ""}`}>
    <div className="element-control-main">
      <span className="element-control-icon">{icon}</span>
      <span className="element-control-copy"><b>{title}</b><small>{description}</small></span>
      {required
        ? <span className="element-required-badge">חובה</span>
        : <label className="element-switch" aria-label={`${enabled ? "הסתרת" : "הצגת"} ${title}`}><input type="checkbox" checked={enabled} onChange={(event) => onToggle?.(event.target.checked)} /><span /></label>}
    </div>
    <button type="button" className="element-style-button" onClick={onEdit} aria-expanded={editing}>
      <span>✎</span>{editing ? "סגירת עיצוב" : "עיצוב האלמנט"}
    </button>
  </article>;
  if (!lockedFeature || !onUnlock) return card;
  return <PlanLockLayer feature={lockedFeature} plan={plan} onUnlock={onUnlock} name={title}>{card}</PlanLockLayer>;
}

export type ElementContentField = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
};

export function ElementStyleEditor({
  elementKey,
  title,
  style,
  onChange,
  onReset,
  content,
}: {
  elementKey: ElementStyleKey;
  title: string;
  style: TemplateElementStyle;
  onChange: (patch: Partial<TemplateElementStyle>) => void;
  onReset: () => void;
  content?: ElementContentField | ElementContentField[];
}) {
  const fields = (Array.isArray(content) ? content : content ? [content] : []).filter((field) => field.label);
  return <section className="element-style-editor" aria-label={`עיצוב ${title}`} data-element={elementKey}>
    <div className="element-style-heading">
      <div><span>עיצוב עצמאי</span><h4>{title}</h4><p>השינויים כאן משפיעים רק על האלמנט הזה ומופיעים מיד בתצוגה.</p></div>
      <button type="button" onClick={onReset}>איפוס</button>
    </div>

    {fields.length ? (
      <div className="element-text-fields">
        {fields.map((field) => (
          <label key={field.label}>
            <span>{field.label}</span>
            {field.multiline
              ? <textarea value={field.value} maxLength={field.maxLength} placeholder={field.placeholder} rows={3} onChange={(event) => field.onChange(event.target.value)} />
              : <input value={field.value} maxLength={field.maxLength} placeholder={field.placeholder} onChange={(event) => field.onChange(event.target.value)} />}
          </label>
        ))}
      </div>
    ) : null}

    <div className="element-color-row">
      <label><span>{elementKey === "shareButtons" ? "צבע הכפתור" : "רקע"}</span><input type="color" value={style.background} onChange={(event) => onChange({ background: event.target.value })} /><code>{style.background}</code></label>
      <label><span>טקסט</span><input type="color" value={style.color} onChange={(event) => onChange({ color: event.target.value })} /><code>{style.color}</code></label>
      <label><span>הדגשה</span><input type="color" value={style.accent} onChange={(event) => onChange({ accent: event.target.value })} /><code>{style.accent}</code></label>
    </div>

    <div className="element-range-row">
      <label><span><b>{isTextLayoutKey(elementKey) ? "גודל טקסט" : "גודל"}</b><strong>{style.size}%</strong></span><input type="range" min={isTextLayoutKey(elementKey) ? 70 : 80} max={isTextLayoutKey(elementKey) ? 220 : 130} step={5} value={style.size} onChange={(event) => onChange({ size: Number(event.target.value) })} /></label>
      <label><span><b>עיגול פינות</b><strong>{style.radius}px</strong></span><input type="range" min={0} max={40} step={2} value={style.radius} onChange={(event) => onChange({ radius: Number(event.target.value) })} /></label>
    </div>

    {isTextLayoutKey(elementKey) ? (
      <div className="element-format-row" role="group" aria-label="עיצוב הטקסט">
        <span>סגנון</span>
        <div>
          <button type="button" className={style.bold ? "active" : ""} aria-pressed={Boolean(style.bold)} onClick={() => onChange({ bold: !style.bold })}><b>B</b></button>
          <button type="button" className={style.italic ? "active" : ""} aria-pressed={Boolean(style.italic)} onClick={() => onChange({ italic: !style.italic })}><i>I</i></button>
          <button type="button" className={style.underline ? "active" : ""} aria-pressed={Boolean(style.underline)} onClick={() => onChange({ underline: !style.underline })}><u>U</u></button>
        </div>
      </div>
    ) : null}

    {CENTERED_COPY_KEYS.has(elementKey) ? null : (
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
    )}
  </section>;
}
