import React from "react";

export function BWAnimatedBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <svg
        className="h-full w-full text-foreground/20"
        viewBox="0 0 1440 600"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
          </pattern>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Subtle grid that slowly pans horizontally */}
        <rect width="100%" height="100%" fill="url(#grid)" className="bw-pan-slow" />

        {/* Gentle layered waves that float up and down */}
        <g transform="translate(0, 0)" className="bw-float">
          <path
            d="M0,380 C240,330 420,430 720,390 C1020,350 1200,430 1440,380 L1440,600 L0,600 Z"
            fill="url(#fade)"
          />
        </g>
        <g className="bw-float" style={{ animationDelay: "2s" } as any}>
          <path
            d="M0,440 C220,400 420,480 720,450 C1020,420 1230,480 1440,440 L1440,600 L0,600 Z"
            fill="url(#fade)"
          />
        </g>
      </svg>
    </div>
  );
}
