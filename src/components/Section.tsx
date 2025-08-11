import * as React from "react";
import { cn } from "@/utils/cn";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  ariaLabel?: string;
}

export function Section({ id, ariaLabel, className, children, ...props }: SectionProps) {
  return (
    <section id={id} aria-label={ariaLabel} className={cn("section container", className)} {...props}>
      {children}
    </section>
  );
}
