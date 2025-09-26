import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExternalMemberships } from "@/hooks/useExternalMemberships";
import { useUserPendingInvites } from "@/hooks/useUserPendingInvites";
import { UserInviteActions } from "./UserInviteActions";
import { Building2, User, Mail } from "lucide-react";

export function BusinessesMembershipSection() {
  const { data: externalMemberships, isLoading, error } = useExternalMemberships();
  const { data: pendingInvites, isLoading: invitesLoading, error: invitesError } = useUserPendingInvites();

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
          External Memberships
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Businesses where you work as an employee and pending invites
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              External ({externalMemberships?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending ({pendingInvites?.length || 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="members" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading businesses...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Failed to load businesses</p>
              </div>
            ) : !externalMemberships || externalMemberships.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">No external memberships</p>
                <p className="text-sm">You're not currently working for any other businesses</p>
              </div>
            ) : (
              <div className="space-y-3">
                {externalMemberships.map((business) => (
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
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <User className="h-3 w-3" />
                        Worker
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pending" className="mt-4">
            {invitesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading pending invites...</div>
              </div>
            ) : invitesError ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Failed to load pending invites</p>
              </div>
            ) : !pendingInvites || pendingInvites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">No pending invites</p>
                <p className="text-sm">You don't have any pending business invitations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <UserInviteActions key={invite.id} invite={invite} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}