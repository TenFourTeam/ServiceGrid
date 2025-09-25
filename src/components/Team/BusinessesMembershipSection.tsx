import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserBusinesses } from "@/hooks/useUserBusinesses";
import { useUserPendingInvites, useAcceptInvite, useDeclineInvite } from "@/hooks/useUserPendingInvites";
import { Building2, Crown, User, Clock, Check, X } from "lucide-react";

export function BusinessesMembershipSection() {
  const { data: businesses, isLoading, error } = useUserBusinesses();
  const { data: pendingInvites, isLoading: pendingLoading, error: pendingError } = useUserPendingInvites();
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Businesses I'm a Member Of
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading businesses...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Businesses I'm a Member Of
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load businesses</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Businesses I'm a Member Of
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          All businesses where you have membership access
        </p>
      </CardHeader>
      <CardContent>
        {/* Pending Invitations Section */}
        {pendingInvites?.invites && pendingInvites.invites.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-warning" />
              <h4 className="font-medium text-sm">Pending Invitations</h4>
            </div>
            <div className="space-y-3">
              {pendingInvites.invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border border-warning/20 bg-warning/5 rounded-lg"
                >
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
                        <Badge variant="outline" className="text-xs border-warning text-warning">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge 
                      variant={invite.role === 'owner' ? 'default' : 'secondary'}
                      className="flex items-center gap-1"
                    >
                      {invite.role === 'owner' ? (
                        <Crown className="h-3 w-3" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                      {invite.role}
                    </Badge>
                    <div className="flex gap-2 ml-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => acceptInvite.mutate({ inviteId: invite.id })}
                        disabled={acceptInvite.isPending || declineInvite.isPending}
                        className="h-8 px-3"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => declineInvite.mutate({ inviteId: invite.id })}
                        disabled={acceptInvite.isPending || declineInvite.isPending}
                        className="h-8 px-3"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Businesses Section */}
        {!businesses || businesses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No business memberships</p>
            <p className="text-sm">You're not currently a member of any businesses</p>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.map((business) => (
              <div
                key={business.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  business.is_current ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {business.logo_url ? (
                    <img 
                      src={business.logo_url} 
                      alt={`${business.name} logo`}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{business.name}</h3>
                      {business.is_current && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Joined {new Date(business.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge 
                    variant={business.role === 'owner' ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {business.role === 'owner' ? (
                      <Crown className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    {business.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}