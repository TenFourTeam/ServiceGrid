import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";

export function TopNav() {
  const [logoError, setLogoError] = useState(false);
  return (
    <header role="banner" className="sticky top-0 z-50 border-b bg-primary/10 dark:bg-primary/15 backdrop-blur supports-[backdrop-filter]:bg-primary/10">
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          {logoError ? (
            <span className="text-sm font-semibold">The Tenfour Project</span>
          ) : (
            <img
              src="/lovable-uploads/tenfour-logo.png"
              alt="The Tenfour Project logo"
              className="h-6 w-auto"
              onError={() => setLogoError(true)}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal" forceRedirectUrl="/calendar">
            <Button variant="ghost" size="sm" className="hover-scale">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/calendar">
            <Button variant="cta" size="sm" className="hover-scale">Try for free</Button>
          </SignUpButton>
        </div>
      </div>
    </header>
  );
}

