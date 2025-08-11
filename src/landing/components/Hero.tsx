import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { content } from "../content";
import { BWAnimatedBackground } from "./BWAnimatedBackground";

function LogoMark() {
  return (
    <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" className="text-primary">
      <path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10h-2a8 8 0 1 0-8 8v2C6.477 22 2 17.523 2 12S6.477 2 12 2Z"/>
      <path fill="currentColor" d="M7 12h10v2H7z"/>
    </svg>
  );
}

export function Hero() {
  const params = new URLSearchParams(location.search);
  const variant = params.get("v")?.toLowerCase() === "b" ? "B" : "A";
  const copy = content.hero[variant as "A" | "B"];

  return (
    <section aria-labelledby="hero-title" className="relative container py-16 md:py-24">
      <BWAnimatedBackground />

      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm text-muted-foreground" data-reveal style={{"--stagger": 0} as any}>{copy.eyebrow}</p>
        <h1 id="hero-title" className="mt-3 text-4xl md:text-6xl font-bold tracking-tight" data-reveal style={{"--stagger": 1} as any}>
          {copy.title}
        </h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground" data-reveal style={{"--stagger": 2} as any}>
          {copy.subtitle}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3" data-reveal style={{"--stagger": 3} as any}>
          <SignUpButton mode="modal" forceRedirectUrl="/calendar">
            <Button size="lg" variant="cta" className="hover-scale">
              Try for free
            </Button>
          </SignUpButton>
        </div>

        <p className="mt-3 text-xs text-muted-foreground" data-reveal style={{"--stagger": 4} as any}>
          No credit card required
        </p>
      </div>
    </section>
  );
}
