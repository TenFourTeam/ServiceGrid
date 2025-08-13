import { Button } from "@/components/Button";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useHasClerk } from "@/components/Auth/ClerkRuntime";
import { content } from "../content";
import { ServiceGridLogo } from "./ServiceGridLogo";
export function TopNav() {
  
  const hasClerk = useHasClerk();
  return (
    <header role="banner" className="sticky top-0 z-50 bg-background/60 dark:bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between py-3">
        <a href="/" aria-label={`${content.brand.name} home`} className="flex items-center gap-2 font-semibold text-foreground">
          <ServiceGridLogo className="h-8 w-auto md:h-10 text-brand-650" />
        </a>
        <div className="flex items-center gap-2">
          {hasClerk ? (
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/calendar">
                <Button variant="ghost" size="sm" className="hover-scale">Sign in</Button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/calendar">
                <Button variant="primary" size="sm" className="hover-scale attention-ring [--ring:var(--brand-600)]">Try for free</Button>
              </SignUpButton>
            </SignedOut>
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

