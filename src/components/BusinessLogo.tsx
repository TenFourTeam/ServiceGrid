import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface BusinessLogoProps {
  src?: string;
  alt?: string;
  size?: number; // in px
  className?: string;
  ring?: boolean;
}

export default function BusinessLogo({ src, alt = "Logo", size = 24, className }: BusinessLogoProps) {
  const [broken, setBroken] = useState(false);

  // Synchronously resolve a last-known logo from localStorage to avoid initial fallback blink
  let lastKnown: string | undefined;
  try {
    const raw = localStorage.getItem('ServiceGrid-lawn-store-v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      const data = parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed ? parsed.data : parsed;
      const b = data?.business;
      const candidate: string | undefined = b?.lightLogoUrl || b?.logoUrl;
      if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) lastKnown = candidate;
    }
  } catch {
    // ignore
  }

  const resolvedSrc = !broken ? (src && src.trim().length > 0 ? src : lastKnown) : undefined;

  const letter = (alt?.trim()?.[0]?.toUpperCase() || 'B');

  if (!resolvedSrc) {
    return (
      <div
        aria-hidden
        className={cn("inline-flex items-center justify-center align-middle rounded-md bg-muted text-muted-foreground", className)}
        style={{ width: size, height: size }}
      >
        <span className="text-[0.6rem] font-semibold" style={{ lineHeight: 1 }}>{letter}</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="eager"
      fetchPriority="high"
      decoding="async"
      width={size}
      height={size}
      onError={() => setBroken(true)}
      className={cn("inline-block align-middle", className)}
      style={{ width: size, height: size }}
    />
  );
}
