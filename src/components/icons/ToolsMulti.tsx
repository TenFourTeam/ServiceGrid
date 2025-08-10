import React from "react";
import { Hammer, Wrench, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ToolsMulti({ className, size = 24, strokeWidth = 2, color, ...rest }: LucideProps) {
  const dim = typeof size === "number" ? `${size}px` : (size as string);
  return (
    <span
      className={cn("relative inline-block", className)}
      style={{ width: dim, height: dim }}
    >
      <Wrench
        {...rest}
        color={color}
        strokeWidth={strokeWidth}
        className="absolute inset-0 w-full h-full"
        style={{ transform: "rotate(18deg) translate(6%, -2%)" }}
        aria-hidden
      />
      <Hammer
        {...rest}
        color={color}
        strokeWidth={strokeWidth}
        className="absolute inset-0 w-full h-full"
        style={{ transform: "rotate(-22deg) translate(-6%, 2%)" }}
        aria-hidden
      />
    </span>
  );
}
