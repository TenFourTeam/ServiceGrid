import { useState, useEffect, useCallback } from "react";
import { Gift, Copy, Check, Users, ArrowRight, ExternalLink } from "lucide-react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription, 
  DrawerFooter 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useProfile } from "@/queries/useProfile";

interface ReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferralModal({ open, onOpenChange }: ReferralModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const { data: profile } = useProfile();
  
  // Generate referral link safely to avoid DataCloneError
  const referralLink = `${location.origin}/invite/referral?ref=${profile?.profile?.id || 'user'}`;
  
  // Add logging for modal lifecycle
  useEffect(() => {
    if (open) {
      console.log('[ReferralModal] Modal opened');
    } else {
      console.log('[ReferralModal] Modal closed');
    }
  }, [open]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[ReferralModal] Component unmounting');
      setCopiedLink(false);
    };
  }, []);
  
  // Safe modal close handler with error boundary
  const handleModalClose = useCallback((newOpen: boolean) => {
    try {
      console.log('[ReferralModal] Close handler called with:', newOpen);
      onOpenChange(newOpen);
    } catch (error) {
      console.error('[ReferralModal] Error in close handler:', error);
      // Fallback - force close
      onOpenChange(false);
    }
  }, [onOpenChange]);
  
  const handleCopyLink = async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }
      
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success("Referral link copied to clipboard!");
      
      // Clear the copied state after 3 seconds
      const timeoutId = setTimeout(() => setCopiedLink(false), 3000);
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error('[ReferralModal] Copy error:', error);
      toast.error("Failed to copy link. Please try again.");
    }
  };

  const steps = [
    {
      icon: Users,
      title: "Share your link",
      description: "Send your unique referral link to friends"
    },
    {
      icon: Gift,
      title: "They subscribe",
      description: "Your friend signs up using your link"
    },
    {
      icon: Check,
      title: "You get 1 free month",
      description: "Earn a month of free service for each referral"
    }
  ];

  return (
    <Drawer 
      open={open} 
      onOpenChange={handleModalClose}
      shouldScaleBackground={false}
    >
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary flex items-center justify-center">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <DrawerTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Earn 1 Free Month
          </DrawerTitle>
          <DrawerDescription className="text-lg text-muted-foreground">
            Refer a friend and get rewarded
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* How it works */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-center">How it works</h3>
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{step.title}</div>
                    <div className="text-sm text-muted-foreground">{step.description}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-3" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Referral link card */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Your referral link</div>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
                  {referralLink}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copiedLink ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Terms */}
          <div className="text-xs text-muted-foreground text-center">
            By participating in our referral program, you agree to our{" "}
            <a 
              href="/legal" 
              className="text-primary hover:underline inline-flex items-center gap-1"
              onClick={() => handleModalClose(false)}
            >
              Terms & Conditions
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={() => handleModalClose(false)} variant="outline" className="w-full">
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}