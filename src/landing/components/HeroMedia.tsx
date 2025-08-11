import React from "react";
import { cn } from "@/utils/cn";

// Collage of UI previews to make the hero feel product-first and premium
export function HeroMedia({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-[420px] md:h-[520px] lg:h-[560px]", className)}>
      {/* Back plate */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-background to-muted/40 border shadow-elev-1" aria-hidden />

      {/* Card: Calendar */}
      <div
        className="absolute left-2 top-6 md:left-4 md:top-8 w-[62%] md:w-[58%] lg:w-[52%] rounded-lg border bg-card shadow-elev-2 hover:shadow-elev-2/90 transition-shadow duration-300"
        aria-label="Schedule calendar preview"
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="h-6 w-24 rounded bg-muted" />
          <div className="h-6 w-16 rounded bg-muted" />
        </div>
        <div className="p-4 grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md border bg-background" />
          ))}
        </div>
      </div>

      {/* Card: Invoice */}
      <div
        className="absolute right-3 top-16 md:right-6 md:top-20 w-[48%] md:w-[44%] lg:w-[40%] rounded-lg border bg-card shadow-elev-2 rotate-2"
        aria-label="Invoice preview"
      >
        <div className="p-4">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="mt-3 h-24 rounded-md border bg-background" />
          <div className="mt-3 h-10 w-28 rounded-md bg-primary/10 text-primary grid place-items-center">
            <span className="text-xs">Pay</span>
          </div>
        </div>
      </div>

      {/* Card: Quote */}
      <div
        className="absolute left-6 bottom-6 md:left-10 md:bottom-10 w-[44%] md:w-[40%] lg:w-[36%] rounded-lg border bg-card shadow-elev-1 -rotate-2"
        aria-label="Quote preview"
      >
        <div className="p-4">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 rounded bg-muted/60" />
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute right-8 bottom-8 rounded-full border bg-background px-4 py-2 shadow-elev-1">
        <span className="text-xs text-muted-foreground">Automations on</span>
      </div>
    </div>
  );
}
