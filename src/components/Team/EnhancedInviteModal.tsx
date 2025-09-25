import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusinessMemberOperations } from "@/hooks/useBusinessMembers";
import { useTeamOperations } from "@/hooks/useTeamOperations";
import { UserPlus, X } from "lucide-react";
import { UserCard } from "./UserCard";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface EnhancedInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export function EnhancedInviteModal({ open, onOpenChange, businessId }: EnhancedInviteModalProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [emailStatuses, setEmailStatuses] = useState<Record<string, { checking: boolean; exists: boolean; alreadyMember: boolean; user?: any }>>({});
  const [processingEmails, setProcessingEmails] = useState<Set<string>>(new Set());
  
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
  };

  // Debounced email checking
  const debouncedEmails = useDebouncedValue(emails, 500);
  
  // Check user existence when debounced emails change
  useEffect(() => {
    debouncedEmails.forEach(email => {
      const trimmedEmail = email.trim();
      if (trimmedEmail.includes('@') && trimmedEmail !== '' && !emailStatuses[trimmedEmail]) {
        checkUserExistence(trimmedEmail);
      }
    });
  }, [debouncedEmails, emailStatuses]);

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


  const handleAddUser = useCallback(async (userId: string, email: string) => {
    setProcessingEmails(prev => new Set(prev).add(email));
    
    try {
      await addTeamMember.mutateAsync({
        userId,
        businessId,
        role: 'worker'
      }, {
        onSuccess: () => {
          toast.success(`${emailStatuses[email]?.user?.name || email.split('@')[0]} added to team`);
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Failed to add team member');
        }
      });
    } finally {
      setProcessingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
    }
  }, [addTeamMember, businessId, emailStatuses]);

  const handleInviteUser = useCallback(async (email: string) => {
    setProcessingEmails(prev => new Set(prev).add(email));
    
    try {
      await inviteWorker.mutateAsync({
        email,
      }, {
        onSuccess: () => {
          toast.success(`Invitation sent to ${email}`);
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Failed to send invitation');
        }
      });
    } finally {
      setProcessingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
    }
  }, [inviteWorker]);

  const handleBatchProcess = async () => {
    const validEmails = emails.filter(email => email.trim() && email.includes('@'));
    if (validEmails.length === 0) return;

    let addedCount = 0;
    let invitedCount = 0;
    let skippedCount = 0;

    for (const email of validEmails) {
      const emailTrimmed = email.trim();
      const status = emailStatuses[emailTrimmed];

      if (status?.alreadyMember) {
        skippedCount++;
      } else if (status?.exists && status.user) {
        await handleAddUser(status.user.id, emailTrimmed);
        addedCount++;
      } else {
        await handleInviteUser(emailTrimmed);
        invitedCount++;
      }
    }

    // Show summary toast
    const messages = [];
    if (addedCount > 0) messages.push(`${addedCount} user${addedCount > 1 ? 's' : ''} added`);
    if (invitedCount > 0) messages.push(`${invitedCount} invitation${invitedCount > 1 ? 's' : ''} sent`);
    if (skippedCount > 0) messages.push(`${skippedCount} already member${skippedCount > 1 ? 's' : ''}`);
    
    if (messages.length > 0) {
      toast.success(messages.join(', '));
    }

    handleClose();
  };

  const handleClose = () => {
    setEmails([""]);
    setEmailStatuses({});
    setProcessingEmails(new Set());
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

        <div className="space-y-6">
            {/* Email input section */}
            <div className="space-y-3">
              <Label>Add Team Members</Label>
              {emails.map((email, index) => (
                <div key={index} className="flex items-center gap-2">
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

            {/* User cards section */}
            <div className="space-y-3">
              {emails
                .filter(email => {
                  const trimmedEmail = email.trim();
                  const status = emailStatuses[trimmedEmail];
                  return status && (status.checking || status.exists);
                })
                .map(email => {
                  const trimmedEmail = email.trim();
                  const status = emailStatuses[trimmedEmail];
                  
                  return (
                    <UserCard
                      key={trimmedEmail}
                      email={trimmedEmail}
                      status={status}
                      onAddUser={(userId) => handleAddUser(userId, trimmedEmail)}
                      onInviteUser={(email) => handleInviteUser(email)}
                      isProcessing={processingEmails.has(trimmedEmail)}
                    />
                  );
                })
              }
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleBatchProcess}
                disabled={processingEmails.size > 0 || emails.filter(e => e.trim() && e.includes('@')).length === 0}
                className="flex items-center gap-2"
              >
                {processingEmails.size > 0 ? (
                  "Processing..."
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Process All ({emails.filter(e => e.trim() && e.includes('@')).length})
                  </>
                )}
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}