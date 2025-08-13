import * as React from "react";

export function PageFade({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={["page-fade", className].filter(Boolean).join(" ")}>{children}</div>
  );
}
