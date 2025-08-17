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
          {/* Profile setup - always shown with completion indicator */}
          <Button
            variant="outline" 
            className="w-full h-auto p-4 flex items-center gap-3 justify-start text-left"
            onClick={() => handleAction(onSetupProfile)}
            disabled={onboardingState.profileComplete}
          >
            <User className={`h-5 w-5 ${onboardingState.profileComplete ? 'text-green-600' : 'text-primary'}`} />
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                Complete Your Profile
                {onboardingState.profileComplete && <span className="text-green-600">✓</span>}
              </div>
              <div className="text-sm text-muted-foreground">
                {onboardingState.profileComplete 
                  ? 'Profile setup complete' 
                  : 'Add your business name and contact details'
                }
              </div>
            </div>
          </Button>

          {/* Main actions - always shown */}
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

          {/* Bank linking - show when profile is complete */}
          {onboardingState.profileComplete && (
            <Button
              variant="outline"
              className="w-full h-auto p-4 flex items-center gap-3 justify-start text-left"
              onClick={() => handleAction(onLinkBank)}
              disabled={onboardingState.bankLinked}
            >
              <CreditCard className={`h-5 w-5 ${onboardingState.bankLinked ? 'text-green-600' : 'text-primary'}`} />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  Connect Bank Account
                  {onboardingState.bankLinked && <span className="text-green-600">✓</span>}
                </div>
                <div className="text-sm text-muted-foreground">
                  {onboardingState.bankLinked 
                    ? 'Bank account connected' 
                    : 'Set up payments and get paid faster'
                  }
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