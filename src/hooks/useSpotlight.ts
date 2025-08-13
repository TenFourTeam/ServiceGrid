import { useState, useEffect, useCallback } from 'react';

export interface SpotlightTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export function useSpotlight(targetSelector?: string) {
  const [target, setTarget] = useState<SpotlightTarget | null>(null);
  const [element, setElement] = useState<Element | null>(null);

  const updateTarget = useCallback(() => {
    if (!targetSelector) {
      setTarget(null);
      setElement(null);
      return;
    }

    const el = document.querySelector(targetSelector);
    if (!el) {
      setTarget(null);
      setElement(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 && 
                      rect.top < window.innerHeight && rect.bottom > 0 &&
                      rect.left < window.innerWidth && rect.right > 0;

    setElement(el);
    setTarget({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      visible: isVisible
    });
  }, [targetSelector]);

  useEffect(() => {
    if (!targetSelector) return;

    // Initial update
    updateTarget();

    // Watch for DOM changes
    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Watch for scroll/resize
    const handleUpdate = () => {
      requestAnimationFrame(updateTarget);
    };

    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [targetSelector, updateTarget]);

  const scrollIntoView = useCallback(() => {
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    }
  }, [element]);

  return { target, element, scrollIntoView, updateTarget };
}