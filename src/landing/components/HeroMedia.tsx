import React from "react";
import { cn } from "@/utils/cn";
import { CalendarDays, Receipt, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/Button";

// Mini previews that echo the actual app UI for credibility
function MiniMonthPreview() {
  return (
    <div className="rounded-lg border bg-card shadow-elev-2">
      <div className="px-2 sm:px-4 py-2 sm:py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
          <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden />
          <span>August 2025</span>
        </div>
        <div className="h-5 w-12 sm:h-6 sm:w-16 rounded bg-muted" aria-hidden />
      </div>
      <div className="p-2 sm:p-4 grid grid-cols-7 gap-1 sm:gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-md border bg-background relative">
            {i % 9 === 0 ? (
              <div className="absolute bottom-0.5 left-0.5 sm:bottom-1 sm:left-1 flex gap-0.5 sm:gap-1">
                <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-brand-650" />
                <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-brand-400" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniInvoicePreview() {
  return (
    <div className="rounded-lg border bg-card shadow-elev-2">
      <div className="px-2 sm:px-4 py-2 sm:py-3 border-b">
        <div className="h-4 w-24 sm:h-5 sm:w-32 rounded bg-muted" aria-hidden />
      </div>
      <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-md border bg-background p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Amount due</p>
            <p className="text-sm sm:text-base font-semibold leading-tight whitespace-nowrap">$245.00</p>
          </div>
          <div className="rounded-md border bg-background p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Status</p>
            <p className="text-xs sm:text-sm font-medium text-brand-650">Pending</p>
          </div>
        </div>
        <div className="rounded-md border bg-background p-2 sm:p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm">Autopay</span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-brand-600" /> Enabled
            </span>
          </div>
        </div>
        <Button size="sm" className="mt-2 text-xs">Pay now</Button>
      </div>
    </div>
  );
}

function MiniQuotePreview() {
  return (
    <div className="rounded-lg border bg-card shadow-elev-2">
      <div className="px-2 sm:px-4 py-2 sm:py-3 border-b">
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
          <Receipt className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden />
          <span>Quote #1047</span>
        </div>
      </div>
      <div className="p-2 sm:p-4 space-y-1.5 sm:space-y-2">
        {["Mow + edge", "Hedge trim", "Leaf cleanup"].map((label, i) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="h-3 sm:h-4 rounded bg-muted/60 flex-1 min-w-0" aria-label={label} />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground shrink-0">${(i + 1) * 45}</span>
          </div>
        ))}
        <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-muted-foreground">Total</span>
          <span className="text-xs sm:text-sm font-semibold">$180</span>
        </div>
      </div>
    </div>
  );
}

function MiniWorkOrderPreview() {
  return (
    <div className="rounded-lg border bg-card shadow-elev-2">
      <div className="px-2 sm:px-4 py-2 sm:py-3 border-b">
        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
          <span>Work order</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-brand-600" aria-hidden />
            <span className="text-[10px] sm:text-xs">Scheduled</span>
          </span>
        </div>
      </div>
      <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
        <div className="rounded-md border bg-background p-2 sm:p-3 overflow-hidden">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Job</p>
          <p className="text-xs sm:text-sm font-medium leading-tight truncate">Mow + edge — 123 Maple St</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-md border bg-background p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Route</p>
            <p className="text-xs sm:text-sm font-medium leading-tight">AM Window</p>
          </div>
          <div className="rounded-md border bg-background p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Crew</p>
            <p className="text-xs sm:text-sm font-medium leading-tight">Team A</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Collage of UI previews to make the hero feel product-first and premium
export function HeroMedia({ className }: { className?: string }) {
  const framed = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("hm") === "framed";

  return (
    <div className={cn("relative h-[320px] sm:h-[420px] md:h-[520px] lg:h-[560px]", className)}>
      {/* Back plate */}
      {framed && (
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-b from-background to-muted/40 border shadow-elev-1"
          aria-hidden
        />
      )}

      {/* Calendar card */}
      <div
        className={cn(
          "absolute left-4 top-4 sm:left-10 sm:top-6 md:left-14 md:top-8 w-[52%] md:w-[48%] lg:w-[44%] rotate-[-0.5deg] will-change-transform transition-transform duration-300 hover:scale-[1.01] z-10"
        )}
        aria-label="Mini month calendar preview"
      >
        <div className={cn("group relative rounded-xl ring-0 hover:ring-1 hover:ring-brand-500/30 transition-shadow duration-300", framed && "rounded-lg border bg-card shadow-elev-2 hover:shadow-elev-2/90")}> 
          <div className="pointer-events-none absolute inset-x-2 top-1 h-0.5 rounded bg-gradient-to-r from-brand-400/40 via-brand-300/30 to-brand-400/40 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          <MiniMonthPreview />
        </div>
      </div>

      {/* Invoice card */}
      <div
        className={cn(
          "absolute right-2 top-12 sm:right-6 sm:top-16 md:right-8 md:top-20 w-[46%] md:w-[42%] lg:w-[38%] rotate-1 will-change-transform transition-transform duration-300 hover:scale-[1.01] z-40"
        )}
        aria-label="Mini invoice preview"
      >
        <div className={cn("group relative rounded-xl ring-0 hover:ring-1 hover:ring-brand-500/30 transition-shadow duration-300", framed && "rounded-lg border bg-card shadow-elev-2")}> 
          <div className="pointer-events-none absolute inset-x-2 top-1 h-0.5 rounded bg-gradient-to-r from-brand-400/40 via-brand-300/30 to-brand-400/40 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          <MiniInvoicePreview />
        </div>
      </div>

      {/* Quote card */}
      <div
        className={cn(
          "absolute left-8 bottom-6 sm:left-16 sm:bottom-8 md:left-24 md:bottom-12 w-[34%] md:w-[30%] lg:w-[28%] -rotate-2 will-change-transform transition-transform duration-300 hover:scale-[1.01] z-20"
        )}
        aria-label="Mini quote preview"
      >
        <div className={cn("group relative rounded-xl ring-0 hover:ring-1 hover:ring-brand-500/30 transition-shadow duration-300", framed && "rounded-lg border bg-card shadow-elev-1")}> 
          <div className="pointer-events-none absolute inset-x-2 top-1 h-0.5 rounded bg-gradient-to-r from-brand-400/40 via-brand-300/30 to-brand-400/40 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          <MiniQuotePreview />
        </div>
      </div>

      {/* Work order card (replaces badge) */}
      <div
  className={cn(
    "absolute right-4 bottom-0 sm:right-12 md:right-20 md:bottom-1 lg:right-28 lg:bottom-3 w-[40%] md:w-[36%] lg:w-[32%] rotate-[1deg] will-change-transform transition-transform duration-300 hover:scale-[1.01] z-30"
  )}
        aria-label="Mini work order preview"
      >
        <div className={cn("group relative rounded-xl ring-0 hover:ring-1 hover:ring-brand-500/30 transition-shadow duration-300", framed && "rounded-lg border bg-card shadow-elev-1")}> 
          <div className="pointer-events-none absolute inset-x-2 top-1 h-0.5 rounded bg-gradient-to-r from-brand-400/40 via-brand-300/30 to-brand-400/40 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          <MiniWorkOrderPreview />
        </div>
      </div>
    </div>
  );
}
