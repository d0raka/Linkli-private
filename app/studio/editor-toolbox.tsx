"use client";

import type { ReactNode } from "react";
import type { PlanFeatureId } from "@/lib/plans";
import { PlanLockLayer } from "./plan-lock";

export type ToolboxTab = "elements" | "design" | "page";

export type ToolboxGroupId = "content" | "look" | "experience" | "place" | "share";

export const TOOLBOX_GROUPS: { id: ToolboxGroupId; title: string }[] = [
  { id: "content", title: "תוכן" },
  { id: "look", title: "סמל ואווירה" },
  { id: "experience", title: "חוויה" },
  { id: "place", title: "מקום והגעה" },
  { id: "share", title: "שיתוף" },
];

export type ToolboxRow = {
  id: string;
  icon: string;
  title: string;
  description: string;
  liveText?: string;
  enabled: boolean;
  required?: boolean;
  unique?: boolean;
  group: ToolboxGroupId;
  screenLabel: string;
  styleKey?: string;
  lockedFeature?: PlanFeatureId;
};

export function EditorToolbox({
  templateName: _templateName,
  className = "",
  tab,
  onTab,
  rows,
  selectedId,
  onSelect,
  onClose,
  onToggle,
  inspector,
  design,
  page,
  screenLabel,
  plan,
  onUnlock,
}: {
  templateName: string;
  className?: string;
  tab: ToolboxTab;
  onTab: (tab: ToolboxTab) => void;
  rows: ToolboxRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onToggle: (id: string, enabled: boolean) => void;
  inspector?: ReactNode;
  design?: ReactNode;
  page?: ReactNode;
  screenLabel: string;
  plan?: string | null;
  onUnlock?: (feature: PlanFeatureId) => void;
}) {
  const selected = rows.find((row) => row.id === selectedId);
  const showDetail = tab === "elements" && Boolean(selected && inspector);

  return (
    <aside className={`editor-toolbox ${className}`.trim()} aria-label="סרגל עריכת העמוד">
      <div className="editor-toolbox-tabs" role="tablist" aria-label="כלי עריכה">
        <button type="button" role="tab" aria-selected={tab === "elements"} className={tab === "elements" ? "active" : ""} onClick={() => onTab("elements")}>אלמנטים</button>
        <button type="button" role="tab" aria-selected={tab === "design"} className={tab === "design" ? "active" : ""} onClick={() => onTab("design")}>עיצוב</button>
        <button type="button" role="tab" aria-selected={tab === "page"} className={tab === "page" ? "active" : ""} onClick={() => onTab("page")}>העמוד</button>
      </div>

      {tab === "elements" && showDetail ? (
        <div className="editor-toolbox-body toolbox-detail">
          <button type="button" className="toolbox-back" onClick={onClose}>← כל האלמנטים במסך {screenLabel}</button>
          {inspector}
        </div>
      ) : null}

      {tab === "elements" && !showDetail ? (
        <div className="editor-toolbox-body">
          {screenLabel === "כל העמוד" ? ["פתיחה", "שאלות", "סיום"].map((label) => {
            const items = rows.filter((row) => row.screenLabel === label);
            if (!items.length) return null;
            return (
              <div className="toolbox-screen-block" key={label}>
                <p className="toolbox-screen-label">{label}</p>
                {renderGroupedItems(items, onSelect, onToggle, plan, onUnlock)}
              </div>
            );
          }) : renderGroupedItems(rows, onSelect, onToggle, plan, onUnlock)}
        </div>
      ) : null}

      {tab === "design" ? <div className="editor-toolbox-body">{design}</div> : null}
      {tab === "page" ? <div className="editor-toolbox-body">{page}</div> : null}
    </aside>
  );
}

function renderGroupedItems(items: ToolboxRow[], onSelect: (id: string) => void, onToggle: (id: string, enabled: boolean) => void, plan?: string | null, onUnlock?: (feature: PlanFeatureId) => void) {
  return TOOLBOX_GROUPS.map((group) => {
    const list = items.filter((row) => row.group === group.id);
    if (!list.length) return null;
    return (
      <ToolboxGroup key={group.id} title={group.title} count={`${list.filter((row) => row.enabled).length}/${list.length}`}>
        {list.map((row) => (
          <ToolboxItem key={row.id} row={row} selected={false} plan={plan} onUnlock={onUnlock} onSelect={() => onSelect(row.id)} onToggle={row.required ? undefined : (value) => onToggle(row.id, value)} />
        ))}
      </ToolboxGroup>
    );
  });
}

function ToolboxGroup({ title, count, children }: { title: string; count: string; children: ReactNode }) {
  return (
    <section className="toolbox-group">
      <header><b>{title}</b><span>{count}</span></header>
      <div className="toolbox-list">{children}</div>
    </section>
  );
}

function ToolboxItem({
  row,
  selected,
  onSelect,
  onToggle,
  plan,
  onUnlock,
}: {
  row: ToolboxRow;
  selected: boolean;
  onSelect: () => void;
  onToggle?: (value: boolean) => void;
  plan?: string | null;
  onUnlock?: (feature: PlanFeatureId) => void;
}) {
  const locked = Boolean(row.lockedFeature);
  const item = (
    <div
      className={`toolbox-item ${row.enabled ? "on" : "off"} ${selected ? "selected" : ""} ${row.unique ? "unique" : ""} ${row.styleKey && !locked ? "is-draggable" : ""} ${locked ? "is-locked" : ""}`}
      draggable={Boolean(row.styleKey) && !locked}
      onDragStart={(event) => {
        if (!row.styleKey || locked) return;
        event.dataTransfer.setData("text/plain", row.styleKey);
        event.dataTransfer.setData("application/x-linkli-element", row.styleKey);
        event.dataTransfer.effectAllowed = "copyMove";
      }}
    >
      <button type="button" className="toolbox-item-main" onClick={onSelect}>
        <span className="toolbox-item-icon" aria-hidden="true">{row.icon}</span>
        <span className="toolbox-item-copy">
          <b>{row.liveText || row.title}</b>
          {row.liveText ? <small>{row.title}</small> : null}
        </span>
        {row.required ? <em>חובה</em> : null}
      </button>
      {row.required ? null : (
        <label className="toolbox-switch">
          <input type="checkbox" checked={row.enabled} onChange={(event) => onToggle?.(event.target.checked)} aria-label={`${row.enabled ? "הסתרת" : "הצגת"} ${row.title}`} />
          <span />
        </label>
      )}
    </div>
  );
  if (!row.lockedFeature || !onUnlock) return item;
  return <PlanLockLayer feature={row.lockedFeature} plan={plan} onUnlock={onUnlock} name={row.title}>{item}</PlanLockLayer>;
}
