import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";
import { useQuoteSubscriptionStatus } from "@/hooks/useQuoteSubscriptionStatus";

interface QuoteSupersededAlertProps {
  customerId?: string;
  quoteId?: string;
  isSubscription?: boolean;
}

export function QuoteSupersededAlert({ customerId, quoteId, isSubscription }: QuoteSupersededAlertProps) {
  const { data, hasActiveSubscription, supersededQuotes } = useQuoteSubscriptionStatus({
    customerId,
    enabled: !!customerId
  });

  if (!customerId) return null;

  const relevantSuperseded = supersededQuotes.filter(q => q.id !== quoteId);
  const showActiveSubscriptionWarning = isSubscription && hasActiveSubscription;
  const showSupersededWarning = relevantSuperseded.length > 0;

  if (!showActiveSubscriptionWarning && !showSupersededWarning) {
    return null;
  }

  return (
    <div className="space-y-2">
      {showActiveSubscriptionWarning && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Active Subscription Detected:</strong> This customer already has an active subscription. 
            Sending a new subscription quote will prevent the customer from creating duplicate subscriptions.
          </AlertDescription>
        </Alert>
      )}

      {showSupersededWarning && (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Previous Quotes:</strong> This customer has {relevantSuperseded.length} previous quote(s) 
            that will be superseded when you send this new quote.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}