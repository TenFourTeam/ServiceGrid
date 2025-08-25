import { Button } from "@/components/Button";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { content } from "../content";
import { ServiceGridLogo } from "./ServiceGridLogo";
export function TopNav() {
  return (
    <header role="banner" className="sticky top-0 z-50 bg-background/60 dark:bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between py-3">
        <a href="/" aria-label={`${content.brand.name} home`} className="flex items-center gap-2 font-semibold text-foreground min-w-0">
          <ServiceGridLogo className="h-8 w-auto md:h-10 text-brand-650 flex-shrink-0" />
        </a>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/calendar">
              <Button variant="ghost" size="sm" className="hover-scale text-xs sm:text-sm px-2 sm:px-3">
                <span className="hidden xs:inline">Sign in</span>
                <span className="xs:hidden">Sign in</span>
              </Button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/calendar">
              <Button variant="primary" size="sm" className="hover-scale attention-ring [--ring:var(--brand-600)] text-xs sm:text-sm px-2 sm:px-3">
                <span className="hidden xs:inline">Try for free</span>
                <span className="xs:hidden">Try free</span>
              </Button>
            </SignUpButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}

