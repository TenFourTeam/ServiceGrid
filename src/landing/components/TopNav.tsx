import { useState } from "react";
import { Button } from "@/components/Button";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { content } from "../content";

export function TopNav() {
  const [logoError, setLogoError] = useState(false);
  return (
    <header role="banner" className="sticky top-0 z-50 bg-background/60 dark:bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          {logoError ? (
            <svg
              width="112"
              height="24"
              viewBox="0 0 112 24"
              role="img"
              aria-label={`${content.brand.name} logo`}
              className="h-20 md:h-24 w-auto"
            >
              <text
                x="0"
                y="18"
                fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
                fontWeight="700"
                fontSize="18"
                fill="currentColor"
                letterSpacing="0.5"
              >
                {content.brand.name}
              </text>
            </svg>
          ) : (
            <img
              src={content.brand.logoSrc}
              alt={`${content.brand.name} logo`}
              className="h-20 md:h-24 w-auto -ml-[2px] md:-ml-[4px]"
              width="112"
              height="24"
              loading="eager"
              crossOrigin="anonymous"
              onError={() => setLogoError(true)}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal" forceRedirectUrl="/calendar">
            <Button variant="ghost" size="sm" className="hover-scale">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/calendar">
            <Button variant="primary" size="sm" className="hover-scale attention-ring bg-gradient-to-r from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 [--ring:hsl(var(--brand-600))]">Try for free</Button>
          </SignUpButton>
        </div>
      </div>
    </header>
  );
}

