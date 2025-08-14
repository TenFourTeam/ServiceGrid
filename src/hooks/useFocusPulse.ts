import { useRef, useState, useCallback } from 'react';

export function useFocusPulse<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [pulse, setPulse] = useState(false);
  
  const focusAndPulse = useCallback((
    opts?: { 
      retries?: number; 
      delay?: number; 
      block?: ScrollLogicalPosition; 
      behavior?: ScrollBehavior; 
    }
  ) => {
    const { retries = 8, delay = 50, block = 'start', behavior = 'smooth' } = opts || {};
    let attempts = 0;

    const tick = () => {
      const el = ref.current;
      if (!el) {
        if (attempts++ < retries) return setTimeout(tick, delay);
        return; // give up silently
      }

      // Ensure programmatic focus is allowed
      el.setAttribute('tabindex', el.getAttribute('tabindex') ?? '-1');

      // Respect user's motion preferences
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const finalBehavior = prefersReducedMotion ? 'auto' : behavior;

      // Scroll into view
      try {
        el.scrollIntoView({ behavior: finalBehavior, block });
        
        // Add offset after scroll completes
        setTimeout(() => {
          window.scrollBy(0, -80);
        }, prefersReducedMotion ? 0 : 300);
      } catch { /* ignore */ }

      // Announce focus for a11y and start pulse
      el.focus({ preventScroll: true });
      setPulse(true);
      
      // Auto-clear pulse after animation
      setTimeout(() => setPulse(false), 1500);
    };

    // Schedule after paint for reliable DOM access
    requestAnimationFrame(() => requestAnimationFrame(tick));
  }, []);

  // Legacy API for backward compatibility
  const focus = useCallback(() => focusAndPulse(), [focusAndPulse]);
  
  return { ref, pulse, focus, focusAndPulse };
}