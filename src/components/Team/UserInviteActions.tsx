import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, Building2, User, Crown } from "lucide-react";
import { UserPendingInvite, useManageInvite } from "@/hooks/useUserPendingInvites";
import { toast } from "sonner";

interface UserInviteActionsProps {
  invite: UserPendingInvite;
}

export function UserInviteActions({ invite }: UserInviteActionsProps) {
  const manageInvite = useManageInvite();

  const handleAccept = async () => {
    try {
      await manageInvite.mutateAsync({ 
        action: 'accept', 
        invite: invite 
      });
      toast.success(`Successfully joined ${invite.business.name}`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to accept invite');
    }
  };

  const handleDecline = async () => {
    try {
      await manageInvite.mutateAsync({ 
        action: 'decline', 
        invite: invite 
      });
      toast.success('Invite declined');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to decline invite');
    }
  };

  const isExpiringSoon = new Date(invite.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* No logo since we don't have it in the new interface */}
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{invite.business.name}</h3>
            <Badge 
              variant={invite.role === 'owner' ? 'default' : 'secondary'}
              className="flex items-center gap-1 text-xs"
            >
              {invite.role === 'owner' ? (
                <Crown className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              {invite.role}
            </Badge>
            {isExpiringSoon && (
              <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                Expires soon
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Invited by {invite.invited_by?.name || invite.invited_by?.email}
          </p>
          <p className="text-xs text-muted-foreground">
            Expires {new Date(invite.expires_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={manageInvite.isPending}
          className="flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          Decline
        </Button>
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={manageInvite.isPending}
          className="flex items-center gap-1"
        >
          {manageInvite.isPending ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <Check className="h-3 w-3" />
              Accept
            </>
          )}
        </Button>
      </div>
    </div>
  );
}