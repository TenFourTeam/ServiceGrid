import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useInviteWorker } from "@/hooks/useBusinessMembers";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Copy, Mail, X, Check } from "lucide-react";

interface EnhancedInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export function EnhancedInviteModal({ open, onOpenChange, businessId }: EnhancedInviteModalProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [role, setRole] = useState("worker");
  const [sendEmail, setSendEmail] = useState(true);
  const [inviteLinks, setInviteLinks] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const { toast } = useToast();
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

  const copyToClipboard = async (link: string, index: number) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedIndex(index);
      toast({
        title: "Link copied",
        description: "Invitation link copied to clipboard",
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validEmails = emails.filter(email => email.trim() && email.includes('@'));
    if (validEmails.length === 0) {
      toast({
        title: "Invalid emails",
        description: "Please enter at least one valid email address",
        variant: "destructive",
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
        // Extract invite links from successful invitations
        const links = successful.map(result => 
          (result as any).value?.inviteLink || ''
        ).filter(Boolean);
        
        setInviteLinks(links);

        toast({
          title: "Invitations sent",
          description: `Successfully sent ${successful.length} invitation${successful.length > 1 ? 's' : ''}`,
        });
      }

      if (failed.length > 0) {
        toast({
          title: "Some invitations failed",
          description: `${failed.length} invitation${failed.length > 1 ? 's' : ''} could not be sent`,
          variant: "destructive",
        });
      }

      if (successful.length === validEmails.length) {
        // If all successful and sending email, close modal
        if (sendEmail) {
          handleClose();
        }
      }

    } catch (error) {
      toast({
        title: "Failed to send invitations",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setEmails([""]);
    setRole("worker");
    setSendEmail(true);
    setInviteLinks([]);
    setCopiedIndex(null);
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

        {inviteLinks.length > 0 ? (
          // Success state - show invite links
          <div className="space-y-4">
            <div className="text-center p-6 bg-muted/20 rounded-lg">
              <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Invitations Created!</h3>
              <p className="text-muted-foreground">
                {sendEmail ? "Emails sent and" : ""} Invitation links generated below
              </p>
            </div>

            <div className="space-y-2">
              <Label>Invitation Links</Label>
              {inviteLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/10">
                  <div className="flex-1 text-sm font-mono truncate">{link}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(link, index)}
                    className="flex items-center gap-2"
                  >
                    {copiedIndex === index ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedIndex === index ? "Copied" : "Copy"}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          // Invite form
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

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-email"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked === true)}
                />
                <Label htmlFor="send-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send invitation email
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                When disabled, you'll get shareable invitation links instead
              </p>
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
                    Send Invitation{emails.filter(e => e.trim()).length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}