import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface BusinessLogoProps {
  src?: string;
  alt?: string;
  size?: number; // in px
  className?: string;
  ring?: boolean;
}

// Auto-contrast logo avatar: chooses a black or white background based on logo luminance.
export default function BusinessLogo({ src, alt = "Logo", size = 28, className, ring = true }: BusinessLogoProps) {
  const [bg, setBg] = useState<"light" | "dark" | null>(null);
  const [broken, setBroken] = useState(false);

  // Analyze the image luminance on load to decide background (white for dark logos, black for light logos)
  const handleAnalyze = (img: HTMLImageElement) => {
    try {
      const canvas = document.createElement("canvas");
      const w = 24, h = 24;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      let sum = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a === 0) continue; // ignore fully transparent
        // relative luminance approximation
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += lum; count++;
      }
      if (count === 0) { setBg("light"); return; }
      const avg = sum / count; // 0..255
      setBg(avg < 140 ? "light" : "dark");
    } catch (e) {
      // Canvas may be tainted due to CORS; fall back to white background (common logos are dark)
      setBg("light");
    }
  };

  const containerStyle = useMemo(() => ({
    width: size,
    height: size,
    // Use semantic CSS vars in HSL for strict theming
    backgroundColor: bg === "light"
      ? "hsl(var(--logo-contrast-light))"
      : bg === "dark"
      ? "hsl(var(--logo-contrast-dark))"
      : undefined,
  }), [size, bg]);

  if (!src || broken) {
    return (
      <div
        className={cn(
          "rounded-full overflow-hidden",
          ring && "ring-1 ring-border",
          className
        )}
        style={containerStyle}
        aria-label={alt}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden",
        ring && "ring-1 ring-border",
        className
      )}
      style={containerStyle}
      aria-label={alt}
    >
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        className="size-full object-cover"
        loading="lazy"
        onLoad={(e) => handleAnalyze(e.currentTarget)}
        onError={() => setBroken(true)}
      />
    </div>
  );
}
