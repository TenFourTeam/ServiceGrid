import React from "react";
import { Wrench, Ruler, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ToolsMulti({ className, strokeWidth = 2, color, ...rest }: LucideProps) {
  return (
    <span
      className={cn("relative inline-block align-middle", className)}
    >
      <Wrench
        {...rest}
        color={color}
        strokeWidth={strokeWidth}
        className="absolute inset-0 w-full h-full"
        style={{ transform: "rotate(18deg) translate(6%, -2%)" }}
        aria-hidden
      />
      <Ruler
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
