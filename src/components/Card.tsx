import * as React from "react";
import { cn } from "@/utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 0 | 1 | 2;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ elevation = 0, className, ...props }, ref) => {
    const shadow = elevation === 2 ? "shadow-elev-2" : elevation === 1 ? "shadow-elev-1" : "shadow-none";
    return (
      <div
        ref={ref}
        className={cn("rounded-lg border bg-card text-card-foreground motion-card", shadow, className)}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
