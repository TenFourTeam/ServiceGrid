import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PricingCardProps {
  tier: 'basic' | 'pro';
  title: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  popular?: boolean;
  isSignedIn: boolean;
  onGetStarted: () => void;
  loading?: boolean;
  signUpButton?: React.ReactNode;
}

export function PricingCard({
  tier,
  title,
  description,
  monthlyPrice,
  yearlyPrice,
  billingPeriod,
  features,
  popular = false,
  isSignedIn,
  onGetStarted,
  loading = false,
  signUpButton,
}: PricingCardProps) {
  const displayPrice = billingPeriod === 'yearly' ? yearlyPrice : monthlyPrice;
  const savings = billingPeriod === 'yearly' ? Math.round((1 - yearlyPrice / monthlyPrice) * 100) : 0;

  return (
    <div 
      className={`relative flex flex-col rounded-lg border bg-card p-8 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg ${
        popular ? 'border-primary shadow-primary/20' : 'border-border'
      }`}
    >
      {popular && (
        <Badge 
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground"
        >
          Popular
        </Badge>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">${displayPrice}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        {billingPeriod === 'yearly' && savings > 0 && (
          <p className="text-sm text-primary mt-2">
            Save {savings}% with yearly billing
          </p>
        )}
      </div>

      {isSignedIn ? (
        <Button 
          onClick={onGetStarted}
          disabled={loading}
          variant={popular ? "cta" : "default"}
          size="lg"
          className="w-full mb-8"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Get Started'
          )}
        </Button>
      ) : (
        <div className="w-full mb-8">
          {signUpButton}
        </div>
      )}

      <div className="space-y-3 flex-1">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
