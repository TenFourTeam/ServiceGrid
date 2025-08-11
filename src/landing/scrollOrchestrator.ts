import { useEffect } from "react";
import { DURATIONS, EASING, HIGHLIGHT_THRESHOLD, REVEAL_ROOT_MARGIN, REVEAL_THRESHOLD, STAGGER_MS } from "./tokens";
import { content, type HighlightKey } from "./content";

let initialized = false;

function selectAll<T extends Element>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll(selector)) as T[];
}

export function initScrollOrchestrator() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reveal observer
  if (!prefersReduced) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.add("is-revealed");
            // TODO: event section_inview when a section wrapper becomes visible
            revealObserver.unobserve(el);
          }
        }
      },
      {
        threshold: REVEAL_THRESHOLD,
        rootMargin: REVEAL_ROOT_MARGIN,
      }
    );

    selectAll<HTMLElement>("[data-reveal]").forEach((el, idx) => {
      el.style.setProperty("--ease", EASING);
      el.style.setProperty("--stagger", String(Number(el.style.getPropertyValue("--stagger")) || idx % 6));
      revealObserver.observe(el);
    });
  } else {
    selectAll<HTMLElement>("[data-reveal]").forEach((el) => el.classList.add("is-revealed"));
  }

  // Highlights sequence
  const steps = selectAll<HTMLElement>("[data-step]");
  const visualsContainer = document.querySelector<HTMLElement>("[data-visuals]");
  const visuals = selectAll<HTMLElement>("[data-visual]");

  function activate(key: HighlightKey) {
    visuals.forEach((v) => {
      if (v.getAttribute("data-visual") === key) {
        v.setAttribute("data-active", "");
      } else {
        v.removeAttribute("data-active");
      }
    });
    // Update aria-live region if present
    const live = document.getElementById("highlights-live");
    if (live) live.textContent = content.highlights.steps.find((s) => s.key === key)?.title || "";
  }

  if (steps.length && visualsContainer && visuals.length) {
    const stepObserver = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .forEach((entry) => {
            const key = entry.target.getAttribute("data-step") as HighlightKey;
            if (key) activate(key);
          });
      },
      { threshold: HIGHLIGHT_THRESHOLD }
    );

    steps.forEach((s) => stepObserver.observe(s));

    // Initialize first
    const firstKey = (steps[0]?.getAttribute("data-step") as HighlightKey) || content.highlights.steps[0].key;
    activate(firstKey);
  }
}
