import React, { useEffect, useRef, useState } from "react";
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

  const letter = (alt?.trim()?.[0]?.toUpperCase() || 'B');

  if (!src || broken) {
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
      src={src}
      alt={alt}
      loading="eager"
      fetchPriority="high"
      decoding="async"
      width={size}
      height={size}
      onError={() => setBroken(true)}
      className={cn("inline-block align-middle animate-fade-in", className)}
      style={{ width: size, height: size }}
    />
  );
}
