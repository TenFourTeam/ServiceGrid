import * as React from "react";
import { cn } from "@/utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 0 | 1 | 2;
}

export function Card({ elevation = 0, className, ...props }: CardProps) {
  const shadow = elevation === 2 ? "shadow-elev-2" : elevation === 1 ? "shadow-elev-1" : "shadow-none";
  return (
    <div
      className={cn("rounded-lg border bg-card text-card-foreground motion-card", shadow, className)}
      {...props}
    />
  );
}
