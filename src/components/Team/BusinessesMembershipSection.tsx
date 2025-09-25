import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserBusinesses, UserBusiness } from "@/hooks/useUserBusinesses";
import { useUserPendingMemberships, useRespondToMembership } from "@/hooks/useUserPendingMemberships";
import { format } from "date-fns";
import { Building2, Users, Clock, Check, X, Crown, User } from "lucide-react";

export function BusinessesMembershipSection() {
  const { data: businesses, isLoading, error } = useUserBusinesses();
  const { data: pendingMemberships, isLoading: loadingPending } = useUserPendingMemberships();
  const respondToMembership = useRespondToMembership();

  if (isLoading || loadingPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading your business memberships...</p>
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
    <div className="space-y-6">
      {/* Pending Membership Requests */}
      {pendingMemberships && pendingMemberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Membership Requests
            </CardTitle>
            <CardDescription>
              You have been invited to join these businesses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingMemberships.map((membership) => (
              <div
                key={membership.id}
                className="p-4 border rounded-lg bg-orange-50/50 border-orange-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <h3 className="font-medium text-base truncate">{membership.business_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Invited {format(new Date(membership.invited_at), 'MMM d, yyyy')}
                        </p>
                        {membership.business_description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {membership.business_description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      {membership.role === 'owner' ? 'Owner' : 'Member'}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => respondToMembership.mutate({
                          businessId: membership.business_id,
                          action: 'reject'
                        })}
                        disabled={respondToMembership.isPending}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => respondToMembership.mutate({
                          businessId: membership.business_id,
                          action: 'accept'
                        })}
                        disabled={respondToMembership.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Current Business Memberships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Businesses I'm a Member Of
          </CardTitle>
          <CardDescription>
            Your current business memberships and roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {businesses && businesses.length > 0 ? (
            businesses.map((business) => (
              <div
                key={business.id}
                className={`p-4 border rounded-lg transition-colors ${
                  business.is_current ? 'bg-muted/50 border-primary' : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {business.logo_url && (
                        <img
                          src={business.logo_url}
                          alt={`${business.name} logo`}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div>
                        <h3 className="font-medium text-base truncate">{business.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Joined {format(new Date(business.joined_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={business.role === 'owner' ? 'default' : 'secondary'}>
                      {business.role === 'owner' ? 'Owner' : 'Member'}
                    </Badge>
                    {business.is_current && (
                      <Badge variant="outline" className="text-primary border-primary">
                        Current
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No Business Memberships</p>
              <p className="text-sm">You're not a member of any businesses yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}