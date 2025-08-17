import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusinessMembersData, useBusinessMemberOperations } from "@/hooks/useBusinessMembers";
import { usePendingInvites, useRevokeInvite, useResendInvite } from "@/hooks/useInvites";
import { EnhancedInviteModal } from "@/components/Team/EnhancedInviteModal";
import { TeamSearchFilter } from "@/components/Team/TeamSearchFilter";
import { TeamMemberActions } from "@/components/Team/TeamMemberActions";
import { UserPlus, Mail, Clock, Send, X, Users, AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { RequireRole } from "@/components/Auth/RequireRole";

interface BusinessMembersListProps {
  businessId: string;
}

export function BusinessMembersList({ businessId }: BusinessMembersListProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    role: null as string | null,
    status: null as string | null,
  });
  

  const { data: members, isLoading, count: membersCount } = useBusinessMembersData();
  const { data: invitesResponse, isLoading: loadingInvites } = usePendingInvites(businessId);
  const { removeMember } = useBusinessMemberOperations();
  const revokeInvite = useRevokeInvite(businessId || '');
  const resendInvite = useResendInvite(businessId || '');

  // Filtered and sorted data
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    
    return members.filter(member => {
      const matchesSearch = !filters.search || 
        member.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
        member.name?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesRole = !filters.role || member.role === filters.role;
      
      const matchesStatus = !filters.status || 
        (filters.status === 'active' && member.joined_at) ||
        (filters.status === 'pending' && !member.joined_at);
      
      return matchesSearch && matchesRole && matchesStatus;
    }).sort((a, b) => {
      // Sort owners first, then by join date
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (b.role === 'owner' && a.role !== 'owner') return 1;
      
      const aDate = a.joined_at || a.invited_at;
      const bDate = b.joined_at || b.invited_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [members, filters]);

  const filteredInvites = useMemo(() => {
    if (!invitesResponse?.invites) return [];
    
    return invitesResponse.invites.filter(invite => {
      const matchesSearch = !filters.search || 
        invite.email.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesSearch;
    }).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [invitesResponse?.invites, filters]);

  const ownerCount = members.filter(m => m.role === 'owner').length;

  // Event handlers
  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
  };

  const handleRoleFilter = (role: string | null) => {
    setFilters(prev => ({ ...prev, role }));
  };

  const handleStatusFilter = (status: string | null) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) {
      return;
    }

    try {
      await revokeInvite.mutateAsync({ inviteId });
      toast.success("Invitation revoked", {
        description: `Invitation for ${email} has been revoked`,
      });
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to revoke invitation",
      });
    }
  };

  const handleResendInvite = async (inviteId: string, email: string) => {
    try {
      await resendInvite.mutateAsync({ inviteId });
      toast.success("Invitation resent", {
        description: `Invitation for ${email} has been resent`,
      });
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to resend invitation",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading team members...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team members and pending invitations • {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <RequireRole role="owner" fallback={null}>
          <Button
            onClick={() => setShowInviteModal(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Invite Worker
          </Button>
        </RequireRole>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <TeamSearchFilter
          onSearch={handleSearchChange}
          onFilterRole={handleRoleFilter}
          onFilterStatus={handleStatusFilter}
          activeFilters={filters}
        />
      </div>

      {/* Seat limit warning */}
      <RequireRole role="owner" fallback={null}>
        {members.length >= 5 && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  Approaching seat limit
                </p>
                <p className="text-xs text-orange-700">
                  You have {members.length}/5 seats used. Consider upgrading for more team members.
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                Upgrade Plan
              </Button>
            </div>
          </div>
        )}
      </RequireRole>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({filteredMembers.length})
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Pending Invites ({filteredInvites.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="members" className="space-y-3 mt-4">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              {filters.search || filters.role || filters.status ? (
                <>
                  <p className="text-lg font-medium mb-2">No members match your filters</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">No team members yet</p>
                  <RequireRole role="owner" fallback={null}>
                    <p className="text-sm">Invite workers to collaborate on your business</p>
                  </RequireRole>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{member.email}</span>
                        <Badge 
                          variant={member.role === 'owner' ? 'default' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          {member.role === 'owner' && <Shield className="h-3 w-3" />}
                          {member.role}
                        </Badge>
                        {member.joined_at && (
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {member.joined_at ? (
                          <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Invited {new Date(member.invited_at).toLocaleDateString()}
                          </span>
                        )}
                        {member.name && (
                          <span>• {member.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <TeamMemberActions
                    member={member}
                    businessId={businessId}
                    isLastOwner={member.role === 'owner' && ownerCount === 1}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invites" className="space-y-3 mt-4">
          {loadingInvites ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading invites...</div>
            </div>
          ) : filteredInvites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
              {filters.search ? (
                <>
                  <p className="text-lg font-medium mb-2">No invites match your search</p>
                  <p className="text-sm">Try adjusting your search terms</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">No pending invitations</p>
                  <RequireRole role="owner" fallback={null}>
                    <p className="text-sm">Invite workers to see pending invitations here</p>
                  </RequireRole>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredInvites.map((invite) => {
                const isExpired = new Date(invite.expires_at) < new Date();
                return (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{invite.email}</span>
                          <Badge 
                            variant={isExpired ? "destructive" : "outline"} 
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {isExpired ? "Expired" : "Pending"}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {invite.role}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Sent {new Date(invite.created_at).toLocaleDateString()} • 
                          Expires {new Date(invite.expires_at).toLocaleDateString()}
                          {invite.profiles?.email && (
                            <span className="ml-2">• Invited by {invite.profiles.email}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <RequireRole role="owner" fallback={null}>
                      <div className="flex items-center gap-2">
                        {!isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvite(invite.id, invite.email)}
                            disabled={resendInvite.isPending}
                            className="flex items-center gap-2"
                          >
                            <Send className="h-4 w-4" />
                            Resend
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite.id, invite.email)}
                          disabled={revokeInvite.isPending}
                          className="flex items-center gap-2 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                          {isExpired ? "Remove" : "Revoke"}
                        </Button>
                      </div>
                    </RequireRole>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Enhanced Invite Modal */}
      <EnhancedInviteModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        businessId={businessId}
      />
    </Card>
  );
}