import { useEffect } from "react";
import { useHasClerk } from "@/components/Auth/ClerkRuntime";
import LoadingScreen from "@/components/LoadingScreen";

import "@/landing/animations.css";
import { Hero } from "@/landing/components/Hero";
import { Benefits } from "@/landing/components/Benefits";
import { HighlightsSticky } from "@/landing/components/HighlightsSticky";
import { CTASection } from "@/landing/components/CTASection";
import { Footer } from "@/landing/components/Footer";
import { initScrollOrchestrator } from "@/landing/scrollOrchestrator";
import { TopNav } from "@/landing/components/TopNav";
import { FAQ } from "@/landing/components/FAQ";
import { Industries } from "@/landing/components/Industries";



export default function Landing() {
  const hasClerk = useHasClerk();

  // Defer scroll orchestrator to avoid blocking first paint
  useEffect(() => {
    let dispose: undefined | (() => void);
    let cancel: undefined | (() => void);

    const schedule = (cb: () => void) => {
      const id = requestAnimationFrame(() => cb());
      return () => cancelAnimationFrame(id);
    };

    cancel = schedule(() => {
      dispose = initScrollOrchestrator?.();
    });

    return () => {
      cancel?.();
      dispose?.();
    };
  }, []);

  // Show loading while Clerk is not loaded (optional check)
  if (!hasClerk) {
    return <LoadingScreen full />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      
      <TopNav />
      <div className="space-y-20 md:space-y-28 lg:space-y-36">
        <Hero />
        <Benefits />
        <Industries />
        <HighlightsSticky />
        <FAQ />
        <CTASection />
      </div>
      <div aria-hidden className="py-8 md:py-12 lg:py-14" />
      <Footer />
    </main>
  );
}
