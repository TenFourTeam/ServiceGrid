import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TopNav } from "@/landing/components/TopNav";
import { Footer } from "@/landing/components/Footer";
import { PricingCard } from "@/components/Pricing/PricingCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useBusinessAuth";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { toast } from "sonner";

const BASIC_FEATURES = [
  "Up to 50 jobs per month",
  "Basic scheduling & calendar",
  "Customer management",
  "Quote generation",
  "Invoice creation",
  "Mobile app access",
  "Email support",
  "2 team members",
];

const PRO_FEATURES = [
  "Everything in Basic",
  "Unlimited jobs",
  "AI-powered estimating",
  "Route optimization",
  "Team chat & collaboration",
  "Advanced analytics",
  "Priority support",
  "Unlimited team members",
  "Custom branding",
  "Recurring invoices",
];

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const { isSignedIn } = useAuth();
  const { createCheckout } = useSubscriptions();
  const navigate = useNavigate();

  const handleGetStarted = async (tier: 'basic' | 'pro') => {
    // User is signed in, start checkout
    try {
      const url = await createCheckout.mutateAsync({ 
        plan: billingPeriod, 
        tier 
      });
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to start checkout'
      );
    }
  };

  const SignUpLink = ({ tier, className, children }: { tier: 'basic' | 'pro'; className?: string; children: React.ReactNode }) => (
    <Link 
      to={`/auth?mode=signup&redirect=/settings?plan=${tier}&billing=${billingPeriod}`}
      className={className}
    >
      {children}
    </Link>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TopNav />
      
      <main className="flex-1 container py-16 px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose the right plan for you
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Simple, transparent pricing that grows with your business
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted/30 inline-flex">
            <Label 
              htmlFor="billing-toggle" 
              className={`text-sm font-medium cursor-pointer transition-colors ${
                billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={billingPeriod === 'yearly'}
              onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
            />
            <Label 
              htmlFor="billing-toggle" 
              className={`text-sm font-medium cursor-pointer transition-colors ${
                billingPeriod === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Yearly
            </Label>
          </div>

          {billingPeriod === 'yearly' && (
            <p className="text-sm text-primary mt-4 font-medium">
              Save 20% with yearly billing
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <PricingCard
            tier="basic"
            title="Basic"
            description="Perfect for small teams getting started"
            monthlyPrice={25}
            yearlyPrice={20}
            billingPeriod={billingPeriod}
            features={BASIC_FEATURES}
            isSignedIn={isSignedIn}
            onGetStarted={() => handleGetStarted('basic')}
            loading={createCheckout.isPending}
            signUpButton={
              <SignUpLink tier="basic" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full">
                Get Started
              </SignUpLink>
            }
          />

          <PricingCard
            tier="pro"
            title="Pro"
            description="For growing teams that need more power"
            monthlyPrice={50}
            yearlyPrice={40}
            billingPeriod={billingPeriod}
            features={PRO_FEATURES}
            popular
            isSignedIn={isSignedIn}
            onGetStarted={() => handleGetStarted('pro')}
            loading={createCheckout.isPending}
            signUpButton={
              <SignUpLink tier="pro" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg h-11 px-8 w-full">
                Get Started
              </SignUpLink>
            }
          />
        </div>

        {/* Additional Info */}
        <div className="text-center mt-16 max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground">
            All plans include a 7-day free trial. No credit card required.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Need a custom plan for your enterprise? <a href="mailto:sales@servicegrid.app" className="text-primary hover:underline">Contact sales</a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
