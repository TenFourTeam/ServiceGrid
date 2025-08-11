import * as React from "react";
import { cn } from "@/utils/cn";

type HeadingAs = "h1" | "h2" | "h3" | "h4";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingAs;
  intent?: "page" | "section";
}

export function Heading({ as: As = "h2", intent = "section", className, ...props }: HeadingProps) {
  const base = intent === "page" ? "text-4xl md:text-6xl font-bold tracking-tight" : "text-2xl md:text-4xl font-semibold tracking-tight";
  return <As className={cn(base, className)} {...props} />;
}
