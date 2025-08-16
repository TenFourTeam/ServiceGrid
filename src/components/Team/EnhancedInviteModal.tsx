import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useInviteWorker } from "@/hooks/useBusinessMembers";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";

interface EnhancedInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export function EnhancedInviteModal({ open, onOpenChange, businessId }: EnhancedInviteModalProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [role, setRole] = useState("worker");
  
  const inviteWorker = useInviteWorker();

  const addEmail = () => {
    setEmails([...emails, ""]);
  };

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validEmails = emails.filter(email => email.trim() && email.includes('@'));
    if (validEmails.length === 0) {
      toast.error("Invalid emails", {
        description: "Please enter at least one valid email address",
      });
      return;
    }

    try {
      const results = await Promise.allSettled(
        validEmails.map(email => 
          inviteWorker.mutateAsync({
            businessId,
            email: email.trim(),
          })
        )
      );

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      if (successful.length > 0) {
        toast.success("Invitations sent", {
          description: `Successfully sent ${successful.length} invitation email${successful.length > 1 ? 's' : ''}`,
        });
        handleClose();
      }

      if (failed.length > 0) {
        toast.error("Some invitations failed", {
          description: `${failed.length} invitation${failed.length > 1 ? 's' : ''} could not be sent`,
        });
      }

    } catch (error) {
      toast.error("Failed to send invitations", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleClose = () => {
    setEmails([""]);
    setRole("worker");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Members
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email addresses */}
            <div className="space-y-3">
              <Label>Email Addresses</Label>
              {emails.map((email, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder={`worker${emails.length > 1 ? index + 1 : ''}@company.com`}
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    className="flex-1"
                  />
                  {emails.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeEmail(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addEmail}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Another Email
              </Button>
            </div>

            {/* Role selection */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Worker</Badge>
                      <span className="text-sm text-muted-foreground">Can view and edit jobs, quotes, customers</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>


            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={inviteWorker.isPending}
                className="flex items-center gap-2"
              >
                {inviteWorker.isPending ? (
                  "Sending..."
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Send Email Invitation{emails.filter(e => e.trim()).length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}