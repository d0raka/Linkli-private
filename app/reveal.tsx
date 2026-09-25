"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

type RevealTag = "div" | "section" | "article" | "p" | "header" | "footer" | "ul";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    || document.documentElement.dataset.reduceMotion === "true";
}

function isInViewport(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  return rect.top < window.innerHeight - 24 && rect.bottom > 24;
}

export default function Reveal({
  as: Tag = "div",
  children,
  className = "",
  delay = 0,
  eager = false,
  ...props
}: {
  as?: RevealTag;
  children: ReactNode;
  className?: string;
  delay?: number;
  eager?: boolean;
} & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [armed, setArmed] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || eager || prefersReducedMotion()) return;
    if (isInViewport(node)) return;

    setArmed(true);
    setVisible(false);

    const show = () => {
      setVisible(true);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) show();
    }, { threshold: 0, rootMargin: "80px 0px 0px 0px" });
    const onScroll = () => {
      if (isInViewport(node)) show();
    };

    observer.observe(node);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [eager]);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${eager ? "reveal-hero" : ""} ${armed ? "reveal-armed" : ""} ${visible ? "is-inview" : ""} ${className}`.trim()}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      {...props}
    >
      {children}
    </Tag>
  );
}
