import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { toast } from "sonner";
import { useUser } from "@clerk/clerk-react";
import { Copy, Gift } from "lucide-react";

interface ReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferralModal({ open, onOpenChange }: ReferralModalProps) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  
  // Generate referral link
  const referralLink = `${window.location.origin}/invite/referral?ref=${user?.id || 'user'}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCopied(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-center">
          <DrawerTitle className="flex items-center justify-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Refer A Friend
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-4 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-primary">Give 1 free month, Get 1 free month!</h3>
            <p className="text-muted-foreground">
              When your friend signs up with your referral link, you both get 1 free month of service.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referral-link">Your Referral Link</Label>
              <div className="flex gap-2">
                <Input
                  id="referral-link"
                  value={referralLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-sm text-green-600">✓ Link copied to clipboard!</p>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium">How it works:</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Share your referral link with friends</li>
                <li>2. They sign up and create their business</li>
                <li>3. You both get 1 free month of service!</li>
              </ol>
            </div>
          </div>
        </div>
        
        <DrawerFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="w-full"
          >
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}