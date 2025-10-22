import { useEffect } from "react";
import Intercom from '@intercom/messenger-js-sdk';

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
  // Defer scroll orchestrator to avoid blocking first paint
  useEffect(() => {
    let dispose: undefined | (() => void);

    const schedule = (cb: () => void) => {
      const id = requestAnimationFrame(() => cb());
      return () => cancelAnimationFrame(id);
    };

    const cancel = schedule(() => {
      dispose = initScrollOrchestrator?.();
    });

    return () => {
      cancel?.();
      dispose?.();
    };
  }, []);

  // Initialize Intercom messenger
  Intercom({
    app_id: 'ijvmhny1',
  });

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
