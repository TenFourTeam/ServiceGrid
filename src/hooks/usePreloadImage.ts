import { useEffect } from 'react';

export function usePreloadImage(url?: string) {
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.fetchPriority = 'high' as 'high';
    img.decoding = 'async';
    img.src = url;
    // Best-effort decode to prime cache without blocking
    if ('decode' in img) {
      (img as HTMLImageElement & { decode?: () => Promise<void> }).decode?.().catch(() => void 0);
    }
  }, [url]);
}

// Preload multiple images at once on mount
export function usePreloadImages(urls?: string[]) {
  useEffect(() => {
    if (!urls || urls.length === 0) return;
    const images = urls
      .filter(Boolean)
      .map((u) => {
        const el = new Image();
        (el as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'high';
        el.decoding = 'async';
        el.src = u as string;
        if ('decode' in el) {
          (el as HTMLImageElement & { decode?: () => Promise<void> }).decode?.().catch(() => void 0);
        }
        return el;
      });
    return () => {
      // Allow GC to reclaim if needed
      images.splice(0, images.length);
    };
  }, [urls?.join('|')]);
}
