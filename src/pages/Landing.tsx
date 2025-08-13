import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
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
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to calendar, unless they just logged out
  useEffect(() => {
    if (hasClerk && isLoaded && isSignedIn) {
      // Check if user just logged out - if so, let them see the landing page
      const justLoggedOut = sessionStorage.getItem('just-logged-out');
      if (justLoggedOut) {
        sessionStorage.removeItem('just-logged-out');
        return;
      }
      
      // Otherwise redirect authenticated users to calendar
      const timer = setTimeout(() => {
        navigate('/calendar', { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasClerk, isLoaded, isSignedIn, navigate]);

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

  // Show loading while checking auth state for Clerk users or during initial load
  if (!hasClerk || (hasClerk && !isLoaded)) {
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
