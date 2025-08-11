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
          {/* Diagonal line pattern for a plain black pattern look */}
          <pattern id="diagonal" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
            <path d="M0 16 L16 0" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
            <path d="M-8 16 L8 0" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
            <path d="M8 16 L24 0" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Subtle diagonal pattern that slowly drifts */}
        <rect width="100%" height="100%" fill="url(#diagonal)" className="bw-pan-diagonal" />
      </svg>
      {/* Aurora blobs */}
      <div className="aurora aurora--1" />
      <div className="aurora aurora--2" />
      <div className="aurora aurora--3" />
      {/* Soft vignette */}
      <div className="hero-vignette" />
    </div>
  );
}
