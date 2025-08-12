import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Button } from "@/components/Button";
import { content } from "../content";
import { BWAnimatedBackground } from "./BWAnimatedBackground";
import { useRef } from "react";
import { HeroMedia } from "./HeroMedia";
function LogoMark() {
  return <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" className="text-primary">
      <path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10h-2a8 8 0 1 0-8 8v2C6.477 22 2 17.523 2 12S6.477 2 12 2Z" />
      <path fill="currentColor" d="M7 12h10v2H7z" />
    </svg>;
}
export function Hero() {
  const params = new URLSearchParams(location.search);
  const variant = params.get("v")?.toLowerCase() === "b" ? "B" : "A";
  const copy = content.hero[variant as "A" | "B"];
  const heroRef = useRef<HTMLElement | null>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
  };
  return <section aria-labelledby="hero-title" ref={heroRef as any} onMouseMove={onMove} className="relative container py-16 md:py-24 hero-spotlight">
      <BWAnimatedBackground />

      <div className="grid lg:grid-cols-2 gap-10 items-center">
        {/* Copy */}
        <div className="mx-auto max-w-3xl text-center lg:text-left">
          <p className="eyebrow font-jakarta" data-reveal>{copy.eyebrow}</p>
          <h1 id="hero-title" className="mt-3 text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent" data-reveal>
            {copy.title}
          </h1>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground" data-reveal>
            {copy.subtitle}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3" data-reveal>
            <SignUpButton mode="modal" forceRedirectUrl="/calendar">
              <Button size="lg" variant="primary" className="hover-scale attention-ring [--ring:hsl(var(--brand-600))]" id="hero-cta">
                {copy.primaryCta.label}
              </Button>
            </SignUpButton>
            {copy.secondaryCta.label ? (
              <Button size="lg" variant="primary" className="hover-scale" onClick={() => { location.href = copy.secondaryCta.href; }}>
                {copy.secondaryCta.label}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Media */}
        <div className="relative">
          <HeroMedia />
        </div>
      </div>
    </section>;
}