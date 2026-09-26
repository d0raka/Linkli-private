"use client";

import { useRef, useState, type CSSProperties } from "react";
import { PlanLockBadge } from "../plan-lock";
import { UserImage } from "@/app/ui/user-image";

export const BACKGROUND_TEMPLATES = [
  { id: "accent", name: "צבע הדגשה" },
  { id: "soft", name: "רך" },
  { id: "solid", name: "מלא" },
  { id: "dots", name: "נקודות" },
  { id: "bloom", name: "זוהר" },
  { id: "sunset", name: "שקיעה" },
  { id: "waves", name: "גלים" },
  { id: "paper", name: "נייר" },
  { id: "stripes", name: "פסים" },
  { id: "spotlight", name: "זרקור" },
  { id: "aurora", name: "זוהר צפון" },
  { id: "night", name: "לילה" },
  { id: "fluid-mesh", name: "רשת נעה" },
] as const;


export function BackgroundTemplatePicker({
  value,
  accent,
  soft,
  imageUrl,
  uploading,
  error,
  onChange,
  onUpload,
  onRemove,
  photosLocked,
  onUnlockPhotos,
}: {
  value?: string;
  accent: string;
  soft: string;
  imageUrl?: string;
  uploading?: boolean;
  error?: string;
  onChange: (id: string) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  photosLocked?: boolean;
  onUnlockPhotos?: () => void;
}) {
  const selected = value || "soft";
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadButton = (
    <button type="button" role="option" aria-selected={selected === "image"} className={`${selected === "image" ? "active bg-upload-option" : "bg-upload-option"}${photosLocked ? " is-plan-locked" : ""}`} disabled={uploading} onClick={() => {
      if (photosLocked) {
        onUnlockPhotos?.();
        return;
      }
      if (imageUrl && selected !== "image") onChange("image");
      else fileRef.current?.click();
    }}>
      <i className="bg-swatch bg-upload-swatch" aria-hidden="true" style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}>{imageUrl ? "" : uploading ? "…" : "+"}</i>
      <b>{uploading ? "מעלים…" : "התמונה שלי"}</b>
      {photosLocked ? <span className="plan-lock-veil is-inset"><PlanLockBadge feature="photos" plan="free" /></span> : null}
    </button>
  );
  return (
    <div className="bg-template-block">
      <div className="bg-template-picker" role="listbox" aria-label="בחירת רקע לעמוד" style={{ "--preview-soft": soft, "--preview-accent": accent } as CSSProperties}>
        {uploadButton}
        {BACKGROUND_TEMPLATES.map((template) => {
          const active = selected === template.id;
          return (
            <button type="button" key={template.id} role="option" aria-selected={active} className={active ? "active" : ""} onClick={() => onChange(template.id)}>
              <i className={`bg-swatch bg-${template.id}`} aria-hidden="true" />
              <b>{template.name}</b>
            </button>
          );
        })}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) onUpload(file);
      }} />
      <p className="bg-upload-hint">אפשר לבחור תמונה מהמחשב או מהגלריה בטלפון.</p>
      {selected === "image" && imageUrl ? <button type="button" className="bg-upload-remove" onClick={onRemove}>הסרת התמונה</button> : null}
      {error ? <p className="bg-upload-error">{error}</p> : null}
    </div>
  );
}


export const EMOJI_PICKER: Record<string, string[]> = {
  חגיגה: ["🎂", "🎉", "🥳", "🎈", "🎁", "🎊", "🧁", "🎀", "✨", "🌟", "🥂", "🍾", "🍰", "🕯️"],
  רומנטי: ["💘", "❤️", "💕", "💗", "💖", "💌", "🫶", "💐", "😘", "🥰", "😍", "🌹", "💍", "🌙"],
  אירוע: ["🥂", "🍷", "🍽️", "🎬", "✈️", "📸", "🎵", "💃", "🕺", "👑", "💎", "🏠", "🚗", "📍", "🗓️", "⏱️"],
  כללי: ["😊", "🤗", "👋", "🙏", "☀️", "🌈", "🌿", "🌸", "🌺", "🌻", "⭐", "🐶", "🐱", "🧸", "☕", "🔥", "💫", "🪄", "👶"],
};

export function SymbolFace({ emoji, imageUrl }: { emoji: string; imageUrl?: string }) {
  if (imageUrl) return <UserImage src={imageUrl} alt="" className="symbol-photo" />;
  return <>{emoji || "😊"}</>;
}

export function EmojiImageField({
  imageUrl,
  uploading,
  error,
  onUpload,
  onRemove,
  photosLocked,
  onUnlockPhotos,
}: {
  imageUrl?: string;
  uploading?: boolean;
  error?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  photosLocked?: boolean;
  onUnlockPhotos?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadButton = (
    <button type="button" className={`${imageUrl ? "emoji-image-upload has-photo" : "emoji-image-upload"}${photosLocked ? " is-plan-locked" : ""}`} disabled={uploading} onClick={() => {
      if (photosLocked) {
        onUnlockPhotos?.();
        return;
      }
      fileRef.current?.click();
    }}>
      <i aria-hidden="true" style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}>{imageUrl ? "" : "🖼"}</i>
      <span>
        <b>{uploading ? "מעלים תמונה…" : imageUrl ? "החלפת התמונה" : "העלאת תמונה"}</b>
        <small>מהמחשב או מהגלריה בטלפון</small>
      </span>
      {photosLocked ? <span className="plan-lock-veil is-inset"><PlanLockBadge feature="photos" plan="free" /></span> : null}
    </button>
  );
  return (
    <div className="emoji-image-field">
      {uploadButton}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) onUpload(file);
      }} />
      {imageUrl ? <button type="button" className="emoji-image-remove" onClick={onRemove}>חזרה לאימוג׳י</button> : null}
      {error ? <p className="emoji-image-error">{error}</p> : null}
    </div>
  );
}

export function EmojiPicker({
  value,
  onChange,
  multiple = false,
}: {
  value: string | string[];
  onChange: (next: string | string[]) => void;
  multiple?: boolean;
}) {
  const groups = Object.keys(EMOJI_PICKER);
  const [group, setGroup] = useState(groups[0]);
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const emojis = EMOJI_PICKER[group] || [];
  const current = Array.isArray(value) ? value.join(" ") : value;
  const hasValue = Boolean(current);
  return (
    <div className="emoji-picker">
      <div className={`emoji-picker-current${hasValue ? "" : " is-empty"}`}>
        <span>{current || (multiple ? "בחרו קישוטים" : "בחרו סמל")}</span>
        {hasValue ? (
          <button
            type="button"
            className="emoji-picker-clear"
            aria-label={multiple ? "מחיקת הקישוטים" : "מחיקת הסמל"}
            onClick={() => onChange(multiple ? [] : "")}
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="emoji-picker-tabs" role="tablist" aria-label="קבוצות אימוג׳י">
        {groups.map((name) => (
          <button type="button" role="tab" key={name} aria-selected={group === name} className={group === name ? "active" : ""} onClick={() => setGroup(name)}>{name}</button>
        ))}
      </div>
      <div className="emoji-picker-grid">
        {emojis.map((emoji) => (
          <button
            type="button"
            key={emoji}
            className={selected.has(emoji) ? "active" : ""}
            aria-pressed={selected.has(emoji)}
            aria-label={`בחירת ${emoji}`}
            onClick={() => {
              if (multiple) {
                const current = Array.isArray(value) ? value : [];
                onChange(selected.has(emoji) ? current.filter((item) => item !== emoji) : [...current, emoji].slice(0, 8));
              } else {
                onChange(emoji);
              }
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
