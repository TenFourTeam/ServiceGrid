import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";

export function TopNav() {
  const [logoError, setLogoError] = useState(false);
  return (
    <header role="banner" className="sticky top-0 z-50 border-b bg-background/60 dark:bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          {logoError ? (
            <span className="text-sm font-semibold">The Tenfour Project</span>
          ) : (
            <img
              src="/lovable-uploads/97c32918-f6f6-439d-a007-257d62db52a9.png"
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

