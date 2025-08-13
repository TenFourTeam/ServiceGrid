import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Shield, CheckCircle, ArrowRight } from 'lucide-react';
import { useOnboarding } from '@/components/Onboarding/OnboardingProvider';

interface BankLinkPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: 'invoice-send' | 'payment-request' | 'quote-approved';
  customerName?: string;
  amount?: number;
}

export function BankLinkPrompt({ 
  open, 
  onOpenChange, 
  trigger,
  customerName = '',
  amount = 0
}: BankLinkPromptProps) {
  const { openBankLink } = useOnboarding();
  const [isLinking, setIsLinking] = useState(false);

  const config = {
    'invoice-send': {
      title: 'Ready to Get Paid?',
      description: `Link your bank account to collect payment for ${customerName}`,
      urgency: 'recommended',
    },
    'payment-request': {
      title: 'Payment Collection Blocked',
      description: 'You need to link your bank account to receive payments',
      urgency: 'required',
    },
    'quote-approved': {
      title: 'Quote Approved! 🎉',
      description: `${customerName} approved your quote. Set up payments to get paid faster.`,
      urgency: 'opportunity',
    },
  };

  const { title, description, urgency } = config[trigger];

  const handleLinkBank = async () => {
    setIsLinking(true);
    try {
      await openBankLink();
      onOpenChange(false);
    } catch (error) {
      console.error('Bank linking failed:', error);
    } finally {
      setIsLinking(false);
    }
  };

  const getBadgeVariant = () => {
    switch (urgency) {
      case 'required': return 'destructive';
      case 'opportunity': return 'default';
      default: return 'secondary';
    }
  };

  const getButtonText = () => {
    switch (urgency) {
      case 'required': return 'Link Bank Account';
      case 'opportunity': return 'Set Up Payments';
      default: return 'Connect Bank';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <Badge variant={getBadgeVariant()}>
                {urgency === 'required' ? 'Required' : urgency === 'opportunity' ? 'Opportunity' : 'Recommended'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-700">{description}</p>
          
          {amount > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">
                Amount: ${(amount / 100).toFixed(2)}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Why link your bank?</h4>
            <div className="space-y-2">
              {[
                'Get paid 2x faster with automatic transfers',
                'Secure payment processing via Stripe',
                'Professional payment experience for customers',
                'Automatic invoice tracking and updates'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs text-blue-800">
              Bank-level security with 256-bit SSL encryption
            </span>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleLinkBank}
              disabled={isLinking}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isLinking ? 'Connecting...' : getButtonText()}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            {urgency !== 'required' && (
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-gray-300"
              >
                Later
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}