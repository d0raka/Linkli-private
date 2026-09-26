"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react/ssr";

/**
 * Modal built on the native <dialog>: the browser provides the focus trap, inert background,
 * Escape handling and top-layer stacking. Focus returns to the opener when it closes.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size,
  role = "dialog",
  dismissible = true,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "lg";
  role?: "dialog" | "alertdialog";
  dismissible?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => () => opener.current?.focus(), []);

  return (
    <dialog
      ref={ref}
      className={`ui-dialog ${className}`.trim()}
      data-size={size}
      role={role === "alertdialog" ? "alertdialog" : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClose={() => {
        opener.current?.focus();
        if (open) onClose();
      }}
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      {open ? (
        <>
          <header className="ui-dialog__header">
            <div>
              <h2 className="ui-dialog__title" id={titleId}>{title}</h2>
              {description ? <p className="ui-dialog__description" id={descriptionId}>{description}</p> : null}
            </div>
            {dismissible ? (
              <button type="button" className="ui-icon-button ui-dialog__close" aria-label="סגירה" onClick={onClose}>
                <X aria-hidden="true" />
              </button>
            ) : null}
          </header>
          {children ? <div className="ui-dialog__body">{children}</div> : null}
          {footer ? <footer className="ui-dialog__footer">{footer}</footer> : null}
        </>
      ) : null}
    </dialog>
  );
}
