
import { Button } from "@/components/Button";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { useHasClerk } from "@/components/Auth/ClerkRuntime";
import { content } from "../content";

export function TopNav() {
  
  const hasClerk = useHasClerk();
  return (
    <header role="banner" className="sticky top-0 z-50 bg-background/60 dark:bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <img
            src={content.brand.logoSrc}
            alt={`${content.brand.name} logo`}
            className="block h-[60px] md:h-[76px] w-auto origin-left transform-gpu scale-[1.12] md:scale-[1.16] scale-x-[1.288] md:scale-x-[1.334] will-change-transform -ml-4"
            width="112"
            height="24"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="flex items-center gap-2">
          {hasClerk ? (
            <>
              <SignInButton mode="modal" forceRedirectUrl="/calendar">
                <Button variant="ghost" size="sm" className="hover-scale">Sign in</Button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/calendar">
                <Button variant="primary" size="sm" className="hover-scale attention-ring [--ring:var(--brand-600)]">Try for free</Button>
              </SignUpButton>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hover-scale" onClick={() => { location.href = "/clerk-auth"; }}>
                Sign in
              </Button>
              <Button variant="primary" size="sm" className="hover-scale attention-ring [--ring:var(--brand-600)]" onClick={() => { location.href = "/clerk-auth"; }}>
                Try for free
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

