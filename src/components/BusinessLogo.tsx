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

  if (!src || broken) return null;

  return (
    <img
      src={src}
      alt={alt}
      crossOrigin="anonymous"
      loading="lazy"
      onError={() => setBroken(true)}
      className={cn("inline-block align-middle", className)}
      style={{ width: size, height: size }}
    />
  );
}
