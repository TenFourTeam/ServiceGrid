import { Button } from "@/components/Button";
import { SignUpButton } from "@clerk/clerk-react";

interface IndustryCTAProps {
  title: string;
  subtitle: string;
}

export function IndustryCTA({ title, subtitle }: IndustryCTAProps) {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-brand-600 to-brand-700 dark:from-brand-800 dark:to-brand-900">
      <div className="container">
        <div className="flex flex-col items-center text-center gap-6 md:gap-8 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            {title}
          </h2>
          
          <p className="text-lg md:text-xl text-brand-50 max-w-2xl">
            {subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
            <SignUpButton mode="modal" forceRedirectUrl="/calendar">
              <Button 
                variant="secondary" 
                size="lg" 
                className="hover-scale bg-white text-brand-700 hover:bg-brand-50"
              >
                Start Free Trial
              </Button>
            </SignUpButton>
            <Button 
              variant="secondary" 
              size="lg"
              className="hover-scale border-white text-white hover:bg-white/10"
            >
              Schedule a Demo
            </Button>
          </div>

          <p className="text-sm text-brand-100 mt-4">
            No credit card required • Free 14-day trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
