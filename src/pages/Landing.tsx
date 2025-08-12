import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
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
import { useHasClerk } from "@/components/Auth/ClerkRuntime";


export default function Landing() {
  const hasClerk = useHasClerk();
  const navigate = useNavigate();

  // SEO: title, meta description, canonical, structured data, OG/Twitter
  useEffect(() => {
    document.title = "TenFour Lawn — Schedule, quotes, invoices without the back-and-forth.";

    const ensureMetaName = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const ensureMetaProp = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    ensureMetaName(
      "description",
      "Run your lawn business with effortless scheduling, quotes and invoices."
    );

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/`);

    // OG/Twitter
    ensureMetaProp("og:title", document.title);
    ensureMetaProp("og:description", "Run your lawn business with effortless scheduling, quotes and invoices.");
    ensureMetaProp("og:type", "website");
    ensureMetaProp("og:url", window.location.href);
    ensureMetaName("twitter:card", "summary_large_image");
    ensureMetaName("twitter:title", document.title);
    ensureMetaName("twitter:description", "Run your lawn business with effortless scheduling, quotes and invoices.");

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "TenFour Lawn",
      url: window.location.origin,
      description:
        "Run your lawn business with effortless scheduling, quotes and invoices.",
    });
    document.head.appendChild(ld);

    initScrollOrchestrator();

    return () => {
      document.head.contains(ld) && document.head.removeChild(ld);
    };
  }, []);
function RedirectIfSignedIn() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isSignedIn) navigate("/calendar", { replace: true });
  }, [isSignedIn, navigate]);
  return null;
}

  return (
    <main className="min-h-screen bg-background text-foreground">
      {hasClerk && <RedirectIfSignedIn />}
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
