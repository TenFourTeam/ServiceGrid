import { useEffect } from "react";
import { SignedOut, SignedIn, SignInButton, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  // SEO: title, meta description, canonical, structured data
  useEffect(() => {
    document.title = "TenFour Lawn — Simple scheduling, quotes, invoices";

    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    ensureMeta(
      "description",
      "Run your lawn business with effortless scheduling, quotes and invoices."
    );

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/`);

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

    return () => {
      document.head.contains(ld) && document.head.removeChild(ld);
    };
  }, []);

  // If already signed in, go straight to the calendar
  useEffect(() => {
    if (isSignedIn) navigate("/calendar", { replace: true });
  }, [isSignedIn, navigate]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto px-6 py-16 flex min-h-screen items-center">
        <article className="mx-auto max-w-3xl text-center space-y-8">
          <header>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Run your lawn business on autopilot
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground">
              Scheduling, quotes, invoices, and payments — all in one simple app.
            </p>
          </header>

          <div className="flex items-center justify-center gap-3">
            <SignedOut>
              <SignInButton
                mode="modal"
                forceRedirectUrl="/calendar"
                appearance={{
                  elements: {
                    modalBackdrop: "fixed inset-0 bg-background",
                  },
                }}
              >
                <Button size="lg" variant="cta">Get started</Button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Button size="lg" onClick={() => navigate("/calendar", { replace: true })}>
                Open app
              </Button>
            </SignedIn>
          </div>
        </article>
      </section>
    </main>
  );
}
