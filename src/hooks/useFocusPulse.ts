import { useRef, useState, useCallback } from 'react';

export function useFocusPulse<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [pulse, setPulse] = useState(false);
  
  const focus = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    
    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Scroll into view
    el.scrollIntoView({ 
      behavior: prefersReducedMotion ? 'auto' : 'smooth', 
      block: 'center' 
    });
    
    // Trigger pulse animation
    setPulse(true);
    
    // Auto-clear pulse after animation
    const timer = setTimeout(() => setPulse(false), 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  return { ref, pulse, focus };
}