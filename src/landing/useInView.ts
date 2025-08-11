import { useEffect, useRef, useState } from "react";

interface InViewOptions extends IntersectionObserverInit {
  once?: boolean;
}

export function useInView<T extends Element = HTMLElement>(options: InViewOptions = {}) {
  const { root = null, rootMargin = "0px", threshold = 0.15, once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) obs.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { root, rootMargin, threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [root, rootMargin, threshold, once]);

  return { ref, inView } as const;
}
