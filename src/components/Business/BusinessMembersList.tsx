import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useBusinessMembersData, useBusinessMemberOperations } from "@/hooks/useBusinessMembers";
import { usePendingInvites, useRevokeInvite, useResendInvite } from "@/hooks/useInvites";
import { UserSelectionInviteModal } from "@/components/Team/UserSelectionInviteModal";
import { useTeamOperations } from "@/hooks/useTeamOperations";
import { TeamSearchFilter } from "@/components/Team/TeamSearchFilter";
import { TeamMemberActions } from "@/components/Team/TeamMemberActions";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserPlus, Mail, Clock, Send, X, Users, AlertCircle, Shield } from "lucide-react";
import { RequireRole } from "@/components/Auth/RequireRole";

interface BusinessMembersListProps {
  businessId: string;
}

export function BusinessMembersList({ businessId }: BusinessMembersListProps) {
  const { role } = useBusinessContext();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userExistence, setUserExistence] = useState<Record<string, { exists: boolean; isAlreadyMember: boolean; isLoading: boolean }>>({});
  const [filters, setFilters] = useState({
    search: "",
    role: null as string | null,
    status: null as string | null,
  });
  

  const { data: members, isLoading, count: membersCount } = useBusinessMembersData();
  const { data: invitesData, isLoading: loadingInvites } = usePendingInvites(businessId);
  const { removeMember } = useBusinessMemberOperations();
  const revokeInvite = useRevokeInvite(businessId || '');
  const resendInvite = useResendInvite(businessId || '');
  const { checkUserExists, addTeamMember } = useTeamOperations();

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
    if (!invitesData?.invites) return [];
    
    return invitesData.invites.filter(invite => {
      const matchesSearch = !filters.search || 
        invite.email.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesSearch;
    }).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [invitesData?.invites, filters]);

  // Check user existence for all pending invites
  useEffect(() => {
    if (filteredInvites.length > 0) {
      filteredInvites.forEach(async (invite) => {
        if (!userExistence[invite.email]) {
          setUserExistence(prev => ({
            ...prev,
            [invite.email]: { exists: false, isAlreadyMember: false, isLoading: true }
          }));

          try {
            const result = await checkUserExists.mutateAsync({
              email: invite.email,
              businessId: businessId || ''
            });

            setUserExistence(prev => ({
              ...prev,
              [invite.email]: {
                exists: result.exists,
                isAlreadyMember: result.alreadyMember,
                isLoading: false
              }
            }));
          } catch (error) {
            setUserExistence(prev => ({
              ...prev,
              [invite.email]: { exists: false, isAlreadyMember: false, isLoading: false }
            }));
          }
        }
      });
    }
  }, [filteredInvites, businessId, checkUserExists, userExistence]);

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

  const handleRevokeInvite = (inviteId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) {
      return;
    }

    revokeInvite.mutate({ inviteId });
  };

  const handleResendInvite = async (inviteId: string, email: string) => {
    try {
      const userCheck = await checkUserExists.mutateAsync({ 
        email, 
        businessId: businessId || '' 
      });

      if (userCheck.exists && !userCheck.alreadyMember && userCheck.user) {
        addTeamMember.mutate({
          userId: userCheck.user.id,
          businessId: businessId || '',
          role: 'worker'
        }, {
          onSuccess: () => {
            revokeInvite.mutate({ inviteId });
          }
        });
      } else if (userCheck.alreadyMember) {
        revokeInvite.mutate({ inviteId });
      } else {
        resendInvite.mutate({ inviteId });
      }
    } catch (error: Error | unknown) {
      console.error('[BusinessMembersList] resend error:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">{t('team.membersList.loadingMembers')}</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 min-w-0 gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold flex items-center gap-2 truncate">
            <Users className="h-5 w-5 flex-shrink-0" />
            {t('team.membersList.title')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {t('team.membersList.description')} • {t('team.membersList.memberCount', { count: members.length, plural: members.length !== 1 ? 's' : '' })}
          </p>
        </div>
        <RequireRole role="owner" fallback={null}>
          <Button
            onClick={() => setShowInviteModal(true)}
            className="gap-2 flex-shrink-0"
            size="sm"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('team.membersList.inviteWorker')}</span>
            <span className="sm:hidden">{t('team.membersList.invite')}</span>
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
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-orange-800 truncate">
                  {t('team.membersList.seatLimit.title')}
                </p>
                <p className="text-xs text-orange-700 truncate">
                  {t('team.membersList.seatLimit.description', { used: members.length })}
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100 flex-shrink-0 hidden sm:flex">
                {t('team.membersList.seatLimit.upgrade')}
              </Button>
            </div>
          </div>
        )}
      </RequireRole>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('team.membersList.tabs.members')} ({filteredMembers.length})
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('team.membersList.tabs.pendingInvites')} ({filteredInvites.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="members" className="space-y-3 mt-4">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              {filters.search || filters.role || filters.status ? (
                <>
                  <p className="text-lg font-medium mb-2">{t('team.membersList.emptyStates.noMembers')}</p>
                  <p className="text-sm">{t('team.membersList.emptyStates.noMembersDescription')}</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">{t('team.membersList.emptyStates.noTeamMembers')}</p>
                  <RequireRole role="owner" fallback={null}>
                    <p className="text-sm">{t('team.membersList.emptyStates.noTeamMembersDescription')}</p>
                  </RequireRole>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg transition-colors min-w-0 gap-3 ${
                    role === 'owner' && member.user_id ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/20'
                  }`}
                  onClick={() => {
                    if (role === 'owner' && member.user_id) {
                      navigate(`/team/member/${member.user_id}`);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <span className="font-medium truncate min-w-0 text-sm sm:text-base">{member.email}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={member.role === 'owner' ? 'default' : 'secondary'}
                          className="flex items-center gap-1 text-xs"
                        >
                          {member.role === 'owner' && <Shield className="h-3 w-3" />}
                          {member.role}
                        </Badge>
                        {member.joined_at && (
                          <Badge variant="outline" className="text-xs">
                            {t('team.membersList.badges.active')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      {member.joined_at ? (
                        <span className="truncate">{t('team.membersList.memberInfo.joined')} {new Date(member.joined_at).toLocaleDateString()}</span>
                      ) : (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          {t('team.membersList.memberInfo.invited')} {new Date(member.invited_at).toLocaleDateString()}
                        </span>
                      )}
                      {member.name && (
                        <span className="truncate">• {member.name}</span>
                      )}
                      {role === 'owner' && member.user_id && (
                        <span className="text-primary">• {t('team.membersList.memberInfo.clickToViewTimesheet')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <TeamMemberActions
                      member={member}
                      businessId={businessId}
                      isLastOwner={member.role === 'owner' && ownerCount === 1}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invites" className="space-y-3 mt-4">
          {loadingInvites ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">{t('team.membersList.emptyStates.loadingInvites')}</div>
            </div>
          ) : filteredInvites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
              {filters.search ? (
                <>
                  <p className="text-lg font-medium mb-2">{t('team.membersList.emptyStates.noInvitesSearch')}</p>
                  <p className="text-sm">{t('team.membersList.emptyStates.noInvitesSearchDescription')}</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">{t('team.membersList.emptyStates.noInvites')}</p>
                  <RequireRole role="owner" fallback={null}>
                    <p className="text-sm">{t('team.membersList.emptyStates.noInvitesDescription')}</p>
                  </RequireRole>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvites.map((invite) => {
                const isExpired = new Date(invite.expires_at) < new Date();
                const userStatus = userExistence[invite.email];
                const buttonText = userStatus?.isLoading 
                  ? t('team.membersList.inviteActions.checking')
                  : userStatus?.isAlreadyMember 
                    ? t('team.membersList.inviteActions.alreadyMember')
                    : userStatus?.exists 
                      ? t('team.membersList.inviteActions.add')
                      : t('team.membersList.inviteActions.resend');
                const isButtonDisabled = userStatus?.isLoading || userStatus?.isAlreadyMember || resendInvite.isPending || addTeamMember.isPending;
                
                return (
                  <div
                    key={invite.id}
                    className="flex items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/20 transition-colors min-w-0 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <span className="font-medium truncate min-w-0 text-sm sm:text-base">{invite.email}</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant={isExpired ? "destructive" : "outline"} 
                            className="flex items-center gap-1 text-xs"
                          >
                            <Clock className="h-3 w-3" />
                            {isExpired ? t('team.membersList.badges.expired') : t('team.membersList.badges.pending')}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {invite.role}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <div className="truncate">
                          {t('team.membersList.inviteInfo.sent')} {new Date(invite.created_at).toLocaleDateString()} • 
                          {t('team.membersList.inviteInfo.expires')} {new Date(invite.expires_at).toLocaleDateString()}
                        </div>
                        {invite.profiles?.email && (
                          <div className="truncate mt-1">
                            {t('team.membersList.inviteInfo.invitedBy')} {invite.profiles.email}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <RequireRole role="owner" fallback={null}>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                        {!isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvite(invite.id, invite.email)}
                            disabled={isButtonDisabled}
                            className="flex items-center gap-2 text-xs sm:text-sm"
                          >
                            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">{buttonText}</span>
                            <span className="sm:hidden">{buttonText.slice(0, 6)}</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite.id, invite.email)}
                          disabled={revokeInvite.isPending}
                          className="flex items-center gap-2 text-destructive hover:text-destructive text-xs sm:text-sm"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">{isExpired ? "Remove" : "Revoke"}</span>
                          <span className="sm:hidden">{isExpired ? "Rem" : "Rev"}</span>
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

      {/* User Selection Invite Modal */}
      <UserSelectionInviteModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        businessId={businessId}
      />
    </Card>
  );
}