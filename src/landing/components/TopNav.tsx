import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";

export function TopNav() {
  return (
    <header role="banner" className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">TenFour Lawn</span>
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
