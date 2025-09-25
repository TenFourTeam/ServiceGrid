import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusinessMemberOperations } from "@/hooks/useBusinessMembers";
import { useTeamOperations } from "@/hooks/useTeamOperations";
import { UserPlus, X, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EnhancedInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export function EnhancedInviteModal({ open, onOpenChange, businessId }: EnhancedInviteModalProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [emailStatuses, setEmailStatuses] = useState<Record<string, { checking: boolean; exists: boolean; alreadyMember: boolean; user?: any }>>({});
  
  const { inviteWorker } = useBusinessMemberOperations();
  const { checkUserExists, addTeamMember } = useTeamOperations();

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

    // Check user existence when email is complete and valid
    if (value.includes('@') && value.trim() !== '') {
      checkUserExistence(value.trim());
    }
  };

  const checkUserExistence = async (email: string) => {
    if (emailStatuses[email]?.checking) return;

    setEmailStatuses(prev => ({
      ...prev,
      [email]: { checking: true, exists: false, alreadyMember: false }
    }));

    try {
      const result = await checkUserExists.mutateAsync({
        email,
        businessId
      });

      setEmailStatuses(prev => ({
        ...prev,
        [email]: {
          checking: false,
          exists: result.exists,
          alreadyMember: result.alreadyMember,
          user: result.user
        }
      }));
    } catch (error) {
      setEmailStatuses(prev => ({
        ...prev,
        [email]: { checking: false, exists: false, alreadyMember: false }
      }));
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validEmails = emails.filter(email => email.trim() && email.includes('@'));
    if (validEmails.length === 0) {
      return;
    }

    validEmails.forEach(email => {
      const emailTrimmed = email.trim();
      const status = emailStatuses[emailTrimmed];

      if (status?.exists && !status.alreadyMember && status.user) {
        // User exists - add them directly
        addTeamMember.mutate({
          userId: status.user.id,
          businessId,
          role: 'worker'
        });
      } else if (!status?.alreadyMember) {
        // User doesn't exist or status unknown - send email invitation
        inviteWorker.mutate({
          email: emailTrimmed,
        });
      }
    });

    handleClose();
  };

  const handleClose = () => {
    setEmails([""]);
    setEmailStatuses({});
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
              {emails.map((email, index) => {
                const status = emailStatuses[email.trim()];
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        placeholder={`team-member${emails.length > 1 ? index + 1 : ''}@company.com`}
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
                    {email.trim() && email.includes('@') && status && (
                      <div className="ml-2">
                        {status.checking ? (
                          <Badge variant="outline" className="text-xs">
                            Checking...
                          </Badge>
                        ) : status.alreadyMember ? (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Already a member
                          </Badge>
                        ) : status.exists ? (
                          <Badge variant="default" className="text-xs flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            User found - will be added directly
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Will send email invitation
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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



            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={inviteWorker.isPending || addTeamMember.isPending || checkUserExists.isPending}
                className="flex items-center gap-2"
              >
                {(inviteWorker.isPending || addTeamMember.isPending) ? (
                  "Processing..."
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add Team Member{emails.filter(e => e.trim()).length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}