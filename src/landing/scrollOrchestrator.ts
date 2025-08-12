import { useEffect } from "react";
import { DURATIONS, EASING, HIGHLIGHT_THRESHOLD, REVEAL_ROOT_MARGIN, REVEAL_THRESHOLD, STAGGER_MS } from "./tokens";
import { content, type HighlightKey } from "./content";

let revealObserverRef: IntersectionObserver | null = null;
let stepObserverRef: IntersectionObserver | null = null;
let hashHandlerRef: ((this: Window, ev: HashChangeEvent) => any) | null = null;

function selectAll<T extends Element>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll(selector)) as T[];
}

function cleanup() {
  try {
    revealObserverRef?.disconnect();
  } catch {}
  revealObserverRef = null;
  try {
    stepObserverRef?.disconnect();
  } catch {}
  stepObserverRef = null;
  if (hashHandlerRef) {
    try {
      window.removeEventListener("hashchange", hashHandlerRef);
    } catch {}
    hashHandlerRef = null;
  }
}

export function initScrollOrchestrator() {
  if (typeof window === "undefined") return () => {};
  // Tear down any previous observers/listeners to allow re-init
  cleanup();
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reveal observer
  if (!prefersReduced) {
    const revealObserver = (revealObserverRef = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.add("is-revealed");
          } else {
            el.classList.remove("is-revealed");
          }
        }
      },
      {
        threshold: REVEAL_THRESHOLD,
        rootMargin: REVEAL_ROOT_MARGIN,
      }
    ));

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
  const progressEl = document.getElementById("highlights-progress");

  function activate(key: HighlightKey) {
    // Toggle visuals
    visuals.forEach((v) => {
      if (v.getAttribute("data-visual") === key) {
        v.setAttribute("data-active", "");
      } else {
        v.removeAttribute("data-active");
      }
    });

    // Toggle current step
    steps.forEach((s) => {
      if (s.getAttribute("data-step") === key) {
        s.setAttribute("data-current", "");
      } else {
        s.removeAttribute("data-current");
      }
    });

    // Update aria-live region if present
    const live = document.getElementById("highlights-live");
    if (live) live.textContent = content.highlights.steps.find((s) => s.key === key)?.title || "";

    // Update progress bar
    if (progressEl) {
      const total = content.highlights.steps.length;
      const idx = content.highlights.steps.findIndex((s) => s.key === key);
      const pct = Math.max(0, ((idx + 1) / total) * 100);
      (progressEl as HTMLElement).style.width = `${pct}%`;
    }

    // Update URL hash without causing scroll
    try {
      if (location.hash !== `#${key}`) history.replaceState(null, "", `#${key}`);
    } catch {}
  }

  if (steps.length && visualsContainer && visuals.length) {
    const stepObserver = (stepObserverRef = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .forEach((entry) => {
            const key = entry.target.getAttribute("data-step") as HighlightKey;
            if (key) activate(key);
          });
      },
      { threshold: HIGHLIGHT_THRESHOLD }
    ));

    steps.forEach((s) => stepObserver.observe(s));

    // Determine desired step from URL (hash or ?step=)
    const keys = content.highlights.steps.map((s) => s.key);
    const url = new URL(window.location.href);
    const hashKey = window.location.hash?.slice(1);
    const queryKey = url.searchParams.get("step");
    const desiredKey = (keys.includes(hashKey as HighlightKey)
      ? (hashKey as HighlightKey)
      : keys.includes(queryKey as HighlightKey)
      ? (queryKey as HighlightKey)
      : null) as HighlightKey | null;

    if (desiredKey) {
      activate(desiredKey);
      const el = steps.find((s) => s.getAttribute("data-step") === desiredKey);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      // Initialize to "invoice" if present, otherwise first
      const invoiceKey = (keys.includes("invoice" as HighlightKey) ? ("invoice" as HighlightKey) : null);
      const initialKey =
        invoiceKey ??
        ((steps[0]?.getAttribute("data-step") as HighlightKey) || content.highlights.steps[0].key);
      activate(initialKey);
    }

    // React to manual hash changes
    hashHandlerRef = () => {
      const key = window.location.hash?.slice(1) as HighlightKey;
      if (keys.includes(key)) {
        activate(key);
        const el = steps.find((s) => s.getAttribute("data-step") === key);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    window.addEventListener("hashchange", hashHandlerRef);
  }
  return cleanup;
}
