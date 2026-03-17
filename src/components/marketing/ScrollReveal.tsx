import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
}

/**
 * Lightweight scroll-reveal using IntersectionObserver + CSS transitions.
 * Respects prefers-reduced-motion automatically via CSS.
 * No JS animation library needed.
 */
export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const translate =
    direction === "up"
      ? "translate-y-4"
      : direction === "left"
      ? "-translate-x-4"
      : direction === "right"
      ? "translate-x-4"
      : "";

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out motion-reduce:!transform-none motion-reduce:!opacity-100 ${
        visible ? "opacity-100 translate-y-0 translate-x-0" : `opacity-0 ${translate}`
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
