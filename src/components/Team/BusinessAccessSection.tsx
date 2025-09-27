import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserInviteActions } from "@/components/Team/UserInviteActions";
import { useUserBusinesses } from "@/hooks/useUserBusinesses";
import { useUserPendingInvites } from "@/hooks/useUserPendingInvites";
import { Building2, Crown, Users, Mail, Clock } from "lucide-react";

export function BusinessAccessSection() {
  const { data: businesses, isLoading: businessesLoading } = useUserBusinesses();
  const { data: pendingInvites, isLoading: invitesLoading } = useUserPendingInvites();

  if (businessesLoading || invitesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Your Business Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasBusinesses = businesses && businesses.length > 0;
  const hasPendingInvites = pendingInvites && pendingInvites.length > 0;

  if (!hasBusinesses && !hasPendingInvites) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Your Business Access
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Businesses you have access to and pending invitations
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Business Memberships */}
        {hasBusinesses && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Your Businesses ({businesses.length})
            </h4>
            {businesses.map((business) => (
              <div
                key={business.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/20 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={business.logo_url || undefined} alt={business.name} />
                  <AvatarFallback>
                    {business.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{business.name}</span>
                    {business.is_current && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {business.role === 'owner' ? (
                        <Crown className="h-3 w-3" />
                      ) : (
                        <Users className="h-3 w-3" />
                      )}
                      {business.role}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Joined {new Date(business.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending Invites */}
        {hasPendingInvites && (
          <div className="space-y-3">
            {hasBusinesses && <div className="border-t pt-4" />}
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Invites ({pendingInvites.length})
            </h4>
            {pendingInvites.map((invite) => (
              <UserInviteActions key={invite.id} invite={invite} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}