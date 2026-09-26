"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

type RevealTag = "div" | "section" | "article" | "p" | "header" | "footer" | "ul";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    || document.documentElement.dataset.reduceMotion === "true";
}

/**
 * Fades a section in the first time it scrolls into view. Content is visible by default and
 * stays visible without JavaScript, under reduced motion, or when already on screen.
 */
export default function Reveal({
  as: Tag = "div",
  children,
  className = "",
  delay = 0,
  ...props
}: {
  as?: RevealTag;
  children: ReactNode;
  className?: string;
  delay?: number;
} & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [armed, setArmed] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;
    setArmed(true);
    setVisible(false);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "0px 0px -10% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${armed ? "reveal-armed" : ""} ${visible ? "is-inview" : ""} ${className}`.trim()}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      {...props}
    >
      {children}
    </Tag>
  );
}
