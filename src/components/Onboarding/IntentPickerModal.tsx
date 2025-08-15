import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Users, Upload, User, CreditCard, Crown } from 'lucide-react';
import { useState } from 'react';
import { useOnboardingState } from '@/onboarding/streamlined';

interface IntentPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleJob: () => void;
  onCreateQuote: () => void;
  onAddCustomer: () => void;
  onImportCustomers: () => void;
  onSetupProfile: () => void;
  onLinkBank: () => void;
  onStartSubscription: () => void;
}

export function IntentPickerModal({
  open,
  onOpenChange,
  onScheduleJob,
  onCreateQuote,
  onAddCustomer,
  onImportCustomers,
  onSetupProfile,
  onLinkBank,
  onStartSubscription
}: IntentPickerModalProps) {
  const [dismissed, setDismissed] = useState(false);
  const onboardingState = useOnboardingState();

  const handleAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const handleSkip = () => {
    setDismissed(true);
    onOpenChange(false);
  };

  // Don't show if user has dismissed it this session
  if (dismissed) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {onboardingState.profileComplete ? 'What do you want to do next?' : 'Let\'s get you set up'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {/* Show profile setup if incomplete */}
          {!onboardingState.profileComplete && (
            <Button
              variant="outline" 
              className="w-full h-auto p-4 flex items-center gap-3 justify-start text-left"
              onClick={() => handleAction(onSetupProfile)}
            >
              <User className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Complete Your Profile</div>
                <div className="text-sm text-muted-foreground">
                  Add your business name and contact details
                </div>
              </div>
            </Button>
          )}
          
          {/* Show main actions if profile is complete */}
          {onboardingState.profileComplete && (
            <>
          <Button
            variant="outline" 
            className="w-full h-auto p-4 flex items-center gap-3 justify-start text-left"
            onClick={() => handleAction(onScheduleJob)}
          >
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Schedule a Job</div>
              <div className="text-sm text-muted-foreground">
                Book work on your calendar (recommended)
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-auto p-4 flex items-center gap-3 justify-start text-left"
            onClick={() => handleAction(onCreateQuote)}
          >
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Send a Quote</div>
              <div className="text-sm text-muted-foreground">
                Create and send professional estimates
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-auto p-4 flex items-center gap-3 justify-start text-left"
            onClick={() => handleAction(onAddCustomer)}
          >
            <Users className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Add a Customer</div>
              <div className="text-sm text-muted-foreground">
                Start building your customer list
              </div>
            </div>
          </Button>

            <Button
              variant="outline"
              className="w-full h-auto p-4 flex items-center gap-3 justify-start text-left"
              onClick={() => handleAction(onImportCustomers)}
            >
              <Upload className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Import Customers (CSV)</div>
                <div className="text-sm text-muted-foreground">
                  Upload your existing customer list
                </div>
              </div>
            </Button>
            </>
          )}
          
          {/* Show additional setup steps */}
          {onboardingState.profileComplete && !onboardingState.bankLinked && (
            <Button
              variant="outline"
              className="w-full h-auto p-4 flex items-center gap-3 justify-start text-left"
              onClick={() => handleAction(onLinkBank)}
            >
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Connect Bank Account</div>
                <div className="text-sm text-muted-foreground">
                  Set up payments and get paid faster
                </div>
              </div>
            </Button>
          )}
          
          {onboardingState.profileComplete && !onboardingState.subscribed && (
            <Button
              variant="outline"
              className="w-full h-auto p-4 flex items-center gap-3 justify-start text-left"
              onClick={() => handleAction(onStartSubscription)}
            >
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Activate Subscription</div>
                <div className="text-sm text-muted-foreground">
                  Unlock all features and remove limits
                </div>
              </div>
            </Button>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}