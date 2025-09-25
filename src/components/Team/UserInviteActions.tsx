import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, Building2, User, Crown } from "lucide-react";
import { useDeclineInvite, type UserPendingInvite } from "@/hooks/useUserPendingInvites";
import { useRedeemInvite } from "@/hooks/useInvites";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

interface UserInviteActionsProps {
  invite: UserPendingInvite;
}

export function UserInviteActions({ invite }: UserInviteActionsProps) {
  const declineInvite = useDeclineInvite();
  const redeemInvite = useRedeemInvite();
  const queryClient = useQueryClient();
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      await redeemInvite.mutateAsync({ token: invite.token_hash });
      toast.success(`Successfully joined ${invite.businesses.name}`);
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['user-pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to accept invite');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      await declineInvite.mutateAsync(invite.id);
      toast.success('Invite declined');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to decline invite');
    }
  };

  const isExpiringSoon = new Date(invite.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {invite.businesses.logo_url ? (
          <img 
            src={invite.businesses.logo_url} 
            alt={`${invite.businesses.name} logo`}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{invite.businesses.name}</h3>
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
            Invited by {invite.invited_by_profile?.full_name || invite.invited_by_profile?.email}
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
          disabled={declineInvite.isPending || isAccepting}
          className="flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          Decline
        </Button>
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={isAccepting || declineInvite.isPending}
          className="flex items-center gap-1"
        >
          {isAccepting ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Accepting...
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