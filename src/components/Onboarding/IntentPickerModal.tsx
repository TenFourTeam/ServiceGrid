import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Users, Upload, User, CreditCard, Crown, Receipt } from 'lucide-react';
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
  onSendInvoice: () => void;
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
  onStartSubscription,
  onSendInvoice
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="text-center text-xl">
            {onboardingState.profileComplete ? 'What do you want to do next?' : 'Let\'s get you set up'}
          </DrawerTitle>
        </DrawerHeader>
        
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3 pb-4">
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
              onClick={() => handleAction(onSendInvoice)}
            >
              <Receipt className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Send an Invoice</div>
                <div className="text-sm text-muted-foreground">
                  Create and send an invoice to get paid
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
        </ScrollArea>

        <DrawerFooter>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}