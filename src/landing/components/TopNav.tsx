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
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

export function TopNav() {
  const { t } = useLanguage();
  
  return (
    <header role="banner" className="sticky top-0 z-50 bg-background/60 dark:bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center py-3">
        <a href="/" aria-label={`${content.brand.name} home`} className="flex items-center gap-2 font-semibold text-foreground min-w-0">
          <ServiceGridLogo className="h-8 w-auto md:h-10 text-brand-650 flex-shrink-0" />
        </a>

        <div className="flex items-center gap-4 ml-6 flex-1">
          <NavigationMenu className="hidden sm:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm font-medium">
                  {t('landing.nav.resources')}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[min(600px,calc(100vw-2rem))] p-4 sm:p-6">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">Industries We Serve</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
            <LanguageToggle />
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/calendar">
                <Button variant="ghost" size="sm" className="hover-scale text-xs sm:text-sm px-2 sm:px-3">
                  {t('landing.nav.signIn')}
                </Button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/calendar">
                <Button variant="primary" size="sm" className="hover-scale attention-ring [--ring:var(--brand-600)] text-xs sm:text-sm px-2 sm:px-3">
                  <span className="hidden xs:inline">{t('landing.nav.tryFree')}</span>
                  <span className="xs:hidden">{t('landing.nav.tryFreeShort')}</span>
                </Button>
              </SignUpButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
}

