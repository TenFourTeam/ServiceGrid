import { useState } from "react";
import { Button } from "@/components/Button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { content } from "../content";
import { ServiceGridLogo } from "./ServiceGridLogo";
import { getIndustries } from "../industryData";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { Menu, ChevronDown } from "lucide-react";

export function TopNav() {
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const industries = getIndustries(t);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header role="banner" className="sticky top-0 z-50 bg-background/60 dark:bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between py-3">
        <a href="/" aria-label={`${content.brand.name} home`} className="flex items-center gap-2 font-semibold text-foreground min-w-0">
          <ServiceGridLogo className="h-8 w-auto md:h-10 text-brand-650 flex-shrink-0" />
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
          <NavigationMenu className="hidden sm:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/pricing" className="text-sm font-medium px-3 py-2 hover:text-primary transition-colors">
                  Pricing
                </Link>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Link to="/blog" className="text-sm font-medium px-3 py-2 hover:text-primary transition-colors">
                  Blog
                </Link>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Link to="/roadmap" className="text-sm font-medium px-3 py-2 hover:text-primary transition-colors">
                  Roadmap
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/changelog" className="text-sm font-medium px-3 py-2 hover:text-primary transition-colors">
                  Changelog
                </Link>
              </NavigationMenuItem>
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
          
          <LanguageToggle />
          {!isSignedIn && (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="hover-scale text-xs sm:text-sm px-2 sm:px-3">
                  {t('landing.nav.signIn')}
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="primary" size="sm" className="hover-scale attention-ring [--ring:var(--brand-600)] text-xs sm:text-sm px-2 sm:px-3">
                  <span className="hidden xs:inline">{t('landing.nav.tryFree')}</span>
                  <span className="xs:hidden">{t('landing.nav.tryFreeShort')}</span>
                </Button>
              </Link>
            </>
          )}
          {isSignedIn && (
            <Link to="/calendar">
              <Button variant="primary" size="sm" className="hover-scale text-xs sm:text-sm px-2 sm:px-3">
                Dashboard
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button 
              className="md:hidden p-2"
              aria-label={t('landing.nav.menu') || 'Menu'}
            >
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <nav className="flex flex-col gap-6 mt-8">
              {/* Pricing Link */}
              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-foreground hover:text-brand-600"
              >
                Pricing
              </Link>

              {/* Blog Link */}
              <Link
                to="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-foreground hover:text-brand-600"
              >
                Blog
              </Link>

              {/* Roadmap Link */}
              <Link
                to="/roadmap"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-foreground hover:text-brand-600"
              >
                Roadmap
              </Link>

              {/* Changelog Link */}
              <Link
                to="/changelog"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-foreground hover:text-brand-600"
              >
                Changelog
              </Link>

              {/* Industries Section */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-left font-semibold text-foreground hover:text-brand-600">
                  <span>{t('landing.nav.resources')}</span>
                  <ChevronDown className="h-4 w-4 transition-transform ui-expanded:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2">
                  {industries.map((industry) => {
                    const Icon = industry.icon;
                    return (
                      <Link
                        key={industry.slug}
                        to={`/resources/${industry.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
                      >
                        <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                        <span className="text-sm font-medium">{industry.label}</span>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>

              {/* Language Toggle */}
              <div className="pt-4 border-t border-border">
                <LanguageToggle />
              </div>

              {/* Auth Buttons */}
              {!isSignedIn && (
                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-center">
                      {t('landing.nav.signIn')}
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full justify-center">
                      {t('landing.nav.tryFree')}
                    </Button>
                  </Link>
                </div>
              )}
              {isSignedIn && (
                <div className="pt-4 border-t border-border">
                  <Link to="/calendar" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full justify-center">
                      Dashboard
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
