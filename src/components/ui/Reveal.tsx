"use client";
import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/** Adds `in` once the element scrolls into view. One class, CSS does the motion. */
export function Reveal({
  as: Tag = "div",
  className = "",
  delay = 0,
  children,
  once = true,
}: {
  as?: ElementType;
  className?: string;
  delay?: number;
  children: ReactNode;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("in");
            if (once) io.unobserve(el);
          } else if (!once) el.classList.remove("in");
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}
