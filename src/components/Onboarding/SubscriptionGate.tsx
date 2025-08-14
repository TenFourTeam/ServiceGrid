import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock, CheckCircle } from 'lucide-react';
import { useOnboardingActions } from '@/onboarding/hooks';

interface SubscriptionGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  description: string;
  benefits?: string[];
}

export function SubscriptionGate({ 
  open, 
  onOpenChange, 
  feature, 
  description,
  benefits = [
    'Unlimited quotes and invoices',
    'Customer management',
    'Work order scheduling',
    'Payment processing',
    'Email notifications',
    'Priority support'
  ]
}: SubscriptionGateProps) {
  const { openSubscription } = useOnboardingActions();

  const handleUpgrade = () => {
    onOpenChange(false);
    openSubscription();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">Premium Feature</DialogTitle>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                Upgrade Required
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-900">{feature}</p>
              <p className="text-sm text-amber-700">{description}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Unlock with Premium:</h4>
            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-gray-300"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}