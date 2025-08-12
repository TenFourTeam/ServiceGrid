import React from "react";
import { cn } from "@/utils/cn";
import { CalendarDays, Receipt, CheckCircle2 } from "lucide-react";

// Mini previews that echo the actual app UI for credibility
function MiniMonthPreview() {
  return (
    <div className="rounded-lg border bg-card shadow-elev-2">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" aria-hidden />
          <span>August 2025</span>
        </div>
        <div className="h-6 w-16 rounded bg-muted" aria-hidden />
      </div>
      <div className="p-4 grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-md border bg-background relative">
            {i % 9 === 0 ? (
              <div className="absolute bottom-1 left-1 flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
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
      <div className="px-4 py-3 border-b">
        <div className="h-5 w-32 rounded bg-muted" aria-hidden />
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Amount due</p>
            <p className="text-base font-semibold leading-tight whitespace-nowrap">$245.00</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm font-medium text-brand-700">Pending</p>
          </div>
        </div>
        <div className="rounded-md border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Autopay</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" /> Enabled
            </span>
          </div>
        </div>
        <div className="mt-2 h-10 w-28 rounded-md bg-brand-600 text-white grid place-items-center">
          <span className="text-xs">Pay now</span>
        </div>
      </div>
    </div>
  );
}

function MiniQuotePreview() {
  return (
    <div className="rounded-lg border bg-card shadow-elev-2">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Receipt className="h-4 w-4" aria-hidden />
          <span>Quote #1047</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {["Mow + edge", "Hedge trim", "Leaf cleanup"].map((label, i) => (
          <div key={label} className="flex items-center justify-between">
            <span className="h-4 rounded bg-muted/60 w-32" aria-label={label} />
            <span className="text-xs font-medium text-muted-foreground">${(i + 1) * 45}</span>
          </div>
        ))}
        <div className="pt-2 mt-2 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-semibold">$180</span>
        </div>
      </div>
    </div>
  );
}

function MiniWorkOrderPreview() {
  return (
    <div className="rounded-lg border bg-card shadow-elev-2">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Work order</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden />
            <span className="text-xs">Scheduled</span>
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs text-muted-foreground">Job</p>
          <p className="text-sm font-medium leading-tight truncate">Mow + edge — 123 Maple St</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Route</p>
            <p className="text-sm font-medium leading-tight">AM Window</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Crew</p>
            <p className="text-sm font-medium leading-tight">Team A</p>
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
    <div className={cn("relative h-[420px] md:h-[520px] lg:h-[560px]", className)}>
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
          "absolute left-2 top-6 md:left-4 md:top-8 w-[62%] md:w-[58%] lg:w-[52%] rotate-[-0.5deg] will-change-transform transition-transform duration-300 hover:scale-[1.02]",
          framed && "rounded-lg border bg-card shadow-elev-2 hover:shadow-elev-2/90"
        )}
        aria-label="Mini month calendar preview"
      >
        <MiniMonthPreview />
      </div>

      {/* Invoice card */}
      <div
        className={cn(
          "absolute right-3 top-16 md:right-6 md:top-20 w-[48%] md:w-[44%] lg:w-[40%] rotate-1 will-change-transform transition-transform duration-300 hover:scale-[1.02]",
          framed && "rounded-lg border bg-card shadow-elev-2"
        )}
        aria-label="Mini invoice preview"
      >
        <MiniInvoicePreview />
      </div>

      {/* Quote card */}
      <div
        className={cn(
          "absolute left-6 bottom-6 md:left-10 md:bottom-10 w-[44%] md:w-[40%] lg:w-[36%] -rotate-2 will-change-transform transition-transform duration-300 hover:scale-[1.02]",
          framed && "rounded-lg border bg-card shadow-elev-1"
        )}
        aria-label="Mini quote preview"
      >
        <MiniQuotePreview />
      </div>

      {/* Work order card (replaces badge) */}
      <div
        className={cn(
          "absolute right-6 bottom-0 md:right-16 md:bottom-2 lg:right-24 lg:bottom-4 w-[44%] md:w-[40%] lg:w-[36%] rotate-[1deg] will-change-transform transition-transform duration-300 hover:scale-[1.02]",
          framed && "rounded-lg border bg-card shadow-elev-1"
        )}
        aria-label="Mini work order preview"
      >
        <MiniWorkOrderPreview />
      </div>
    </div>
  );
}
