import { useEffect } from 'react';

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
