"use client";

import { createContext, useContext, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { WarningCircle } from "@phosphor-icons/react/ssr";

type FieldContextValue = { id: string; describedBy?: string; invalid: boolean; required: boolean };
const FieldContext = createContext<FieldContextValue | null>(null);

function useFieldControl(id?: string, describedBy?: string) {
  const field = useContext(FieldContext);
  return {
    id: id || field?.id,
    "aria-describedby": [field?.describedBy, describedBy].filter(Boolean).join(" ") || undefined,
    "aria-invalid": field?.invalid || undefined,
    required: field?.required || undefined,
  };
}

/** Label above, hint in markup, error below. Children receive id / aria wiring through context. */
export function Field({
  label,
  hint,
  error,
  optional,
  required = false,
  className = "",
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy: [hintId, errorId].filter(Boolean).join(" ") || undefined, invalid: Boolean(error), required }}>
      <div className={`ui-field ${className}`.trim()}>
        <label className="ui-label" htmlFor={id}>
          {label}
          {optional ? <small>(לא חובה)</small> : null}
        </label>
        {children}
        {hint ? <p className="ui-hint" id={hintId}>{hint}</p> : null}
        {error ? <p className="ui-error" id={errorId} role="alert"><WarningCircle aria-hidden="true" size="1.1em" weight="bold" />{error}</p> : null}
      </div>
    </FieldContext.Provider>
  );
}

export function TextInput({ id, className = "", "aria-describedby": describedBy, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const control = useFieldControl(id, describedBy);
  return <input className={`ui-input ${className}`.trim()} {...rest} {...control} required={rest.required ?? control.required} />;
}

export function TextArea({ id, className = "", "aria-describedby": describedBy, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const control = useFieldControl(id, describedBy);
  return <textarea className={`ui-input ${className}`.trim()} {...rest} {...control} required={rest.required ?? control.required} />;
}

export function Select({ id, className = "", "aria-describedby": describedBy, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  const control = useFieldControl(id, describedBy);
  return <select className={`ui-input ${className}`.trim()} {...rest} {...control} required={rest.required ?? control.required}>{children}</select>;
}

export function Checkbox({ label, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={`ui-check ${className}`.trim()}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function Switch({ label, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <span className={`ui-switch ${className}`.trim()}>
      <input type="checkbox" role="switch" aria-label={label} {...rest} />
      <span aria-hidden="true" />
    </span>
  );
}
