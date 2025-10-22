import { Button } from "@/components/Button";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { content } from "../content";
import { ServiceGridLogo } from "./ServiceGridLogo";
import { industries } from "../industryData";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

export function TopNav() {
  return (
    <header role="banner" className="sticky top-0 z-50 bg-background/60 dark:bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between py-3">
        <a href="/" aria-label={`${content.brand.name} home`} className="flex items-center gap-2 font-semibold text-foreground min-w-0">
          <ServiceGridLogo className="h-8 w-auto md:h-10 text-brand-650 flex-shrink-0" />
        </a>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="text-sm font-medium">
                Resources
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[600px] p-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Industries We Serve</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {industries.map((industry) => {
                      const Icon = industry.icon;
                      return (
                        <NavigationMenuLink key={industry.slug} asChild>
                          <Link
                            to={`/resources/${industry.slug}`}
                            className="group flex flex-col items-start gap-2 rounded-lg border border-border p-3 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                              <span className="text-sm font-medium text-foreground group-hover:text-brand-700 dark:group-hover:text-brand-300">
                                {industry.label}
                              </span>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      );
                    })}
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

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
                <span className="hidden xs:inline">Try for free (no credit card required)</span>
                <span className="xs:hidden">Try free</span>
              </Button>
            </SignUpButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}

