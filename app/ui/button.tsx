import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse" | "danger" | "danger-quiet" | "whatsapp";
export type ButtonSize = "sm" | "md" | "lg";

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: ReactNode;
  iconEnd?: ReactNode;
};

function dataAttributes({ variant = "secondary", size = "md", block }: StyleProps) {
  return {
    "data-variant": variant === "secondary" ? undefined : variant,
    "data-size": size === "md" ? undefined : size,
    "data-block": block ? "" : undefined,
  };
}

export function Button({
  variant,
  size,
  block,
  icon,
  iconEnd,
  loading = false,
  loadingLabel,
  className = "",
  children,
  type = "button",
  disabled,
  ...rest
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingLabel?: string }) {
  return (
    <button
      type={type}
      className={`ui-button ${className}`.trim()}
      {...dataAttributes({ variant, size, block })}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {icon}
      {loading && loadingLabel ? loadingLabel : children}
      {iconEnd}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  icon,
  iconEnd,
  className = "",
  children,
  ...rest
}: StyleProps & ComponentProps<typeof Link>) {
  return (
    <Link className={`ui-button ${className}`.trim()} {...dataAttributes({ variant, size, block })} {...rest}>
      {icon}
      {children}
      {iconEnd}
    </Link>
  );
}

export function IconButton({
  label,
  tone,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "danger" }) {
  return (
    <button type={type} className={`ui-icon-button ${className}`.trim()} aria-label={label} title={label} data-tone={tone} {...rest}>
      {children}
    </button>
  );
}
