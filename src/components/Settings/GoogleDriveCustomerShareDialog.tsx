import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useGoogleDriveSharing } from '@/hooks/useGoogleDriveSharing';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface GoogleDriveCustomerShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId?: string;
  fileName?: string;
}

export function GoogleDriveCustomerShareDialog({
  open,
  onOpenChange,
  fileId,
  fileName,
}: GoogleDriveCustomerShareDialogProps) {
  const { shareWithEmail, isSharing } = useGoogleDriveSharing();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'reader' | 'writer' | 'commenter'>('reader');
  const [message, setMessage] = useState('');

  const handleShare = () => {
    if (!fileId || !email) return;

    shareWithEmail({
      fileId,
      role,
      type: 'user',
      emailAddress: email,
      sendNotification: true,
      message: message || undefined,
    });
    
    onOpenChange(false);
    setEmail('');
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share with Customer</DialogTitle>
          <DialogDescription>
            Grant access to {fileName || 'this file'} via email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Customer Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Permission Level</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reader">Viewer (View only)</SelectItem>
                <SelectItem value="commenter">Commenter (View and comment)</SelectItem>
                <SelectItem value="writer">Editor (Full access)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message to your customer..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={!email || !fileId || isSharing}>
            {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
