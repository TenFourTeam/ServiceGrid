import { useEffect, useMemo } from 'react';

export function usePreloadImage(url?: string) {
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.fetchPriority = 'high' as any;
    img.decoding = 'async';
    img.src = url;
    // Best-effort decode to prime cache without blocking
    if ('decode' in img) {
      (img as any).decode?.().catch(() => void 0);
    }
  }, [url]);
}

// Preload multiple images at once on mount
export function usePreloadImages(urls?: string[]) {
  const urlsKey = useMemo(() => urls?.join('|'), [urls]);
  
  useEffect(() => {
    if (!urls || urls.length === 0) return;
    const images = urls
      .filter(Boolean)
      .map((u) => {
        const el = new Image();
        (el as any).fetchPriority = 'high';
        el.decoding = 'async';
        el.src = u as string;
        if ('decode' in el) {
          (el as any).decode?.().catch(() => void 0);
        }
        return el;
      });
    return () => {
      // Allow GC to reclaim if needed
      images.splice(0, images.length);
    };
  }, [urlsKey]);
}
