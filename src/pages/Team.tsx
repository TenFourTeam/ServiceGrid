import AppLayout from "@/components/Layout/AppLayout";
import { useBusinessMembersData } from "@/hooks/useBusinessMembers";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { EnhancedInviteModal } from "@/components/Team/EnhancedInviteModal";
import { TeamMemberActions } from "@/components/Team/TeamMemberActions";
import { BusinessAccessSection } from "@/components/Team/BusinessAccessSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  AlertTriangle,
  AlertCircle,
  Shield,
  Mail,
  Clock,
  Calendar,
  Repeat,
  Plus,
  Package
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { RequireRole } from "@/components/Auth/RequireRole";
import { TeamAvailabilitySchedule } from "@/components/Team/TeamAvailabilitySchedule";
import { TimeOffManagement } from "@/components/Team/TimeOffManagement";
import { RecurringJobsList } from "@/components/RecurringJobs/RecurringJobsList";
import { RecurringJobModal } from "@/components/RecurringJobs/RecurringJobModal";
import { RecurringJobsMapView } from "@/components/RecurringJobs/RecurringJobsMapView";
import { RouteOptimizer } from "@/components/RecurringJobs/RouteOptimizer";
import { InventoryManagement } from "@/components/Team/InventoryManagement";
import { InventoryItemModal } from "@/components/Team/InventoryItemModal";
import { useRecurringJobTemplates } from "@/hooks/useRecurringJobs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { List, Map as MapIcon, MessageSquare } from "lucide-react";
import { ConversationsTab } from "@/components/Conversations/ConversationsTab";
import { useUnreadMentions } from "@/hooks/useUnreadMentions";

export default function Team() {
  const { t } = useLanguage();
  const { role, businessId } = useBusinessContext();
  const { data: members, isLoading, error } = useBusinessMembersData({ businessId, enabled: !!businessId });
  const { data: recurringTemplates, isLoading: isLoadingRecurring } = useRecurringJobTemplates();
  const { unreadCount } = useUnreadMentions();
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'members';
  const recurringView = searchParams.get('view') || 'list';
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Sorted data
  const sortedMembers = useMemo(() => {
    if (!members || members.length === 0) {
      return [];
    }
    
    return [...members].sort((a, b) => {
      // Owner always first, then workers by join/invite date
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (b.role === 'owner' && a.role !== 'owner') return 1;
      
      // For workers, sort by join date (joined members first, then pending by invite date)
      if (a.role === 'worker' && b.role === 'worker') {
        const aIsJoined = !!a.joined_at;
        const bIsJoined = !!b.joined_at;
        
        if (aIsJoined && !bIsJoined) return -1;
        if (!aIsJoined && bIsJoined) return 1;
        
        const aDate = a.joined_at || a.invited_at;
        const bDate = b.joined_at || b.invited_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }
      
      return 0;
    });
  }, [members]);

  const ownerCount = members?.filter(m => m.role === 'owner').length || 0;

  if (isLoading) {
    return (
      <AppLayout title={t('team.title')}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('team.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading team...</div>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title={t('team.title')}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('team.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Unable to load team members</p>
              <p className="text-sm">
                {error instanceof Error ? error.message : "Please try refreshing the page"}
              </p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('team.title')}>
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              {t("Team")}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your team members and scheduling
            </p>
          </div>
          {activeTab === 'members' && (
            <Button 
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Invite Worker
            </Button>
          )}
          {activeTab === 'recurring' && (
            <Button 
              onClick={() => setIsRecurringModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          )}
          {activeTab === 'inventory' && (
            <Button 
              onClick={() => setIsInventoryModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('team.tabs.members', 'Members')}</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">{t('team.tabs.availability', 'Availability')}</span>
            </TabsTrigger>
            <TabsTrigger value="timeoff" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{t('team.tabs.timeOff', 'Time Off')}</span>
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              <span className="hidden sm:inline">{t('team.tabs.recurring', 'Recurring Jobs')}</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">{t('team.tabs.inventory', 'Inventory')}</span>
            </TabsTrigger>
            <TabsTrigger value="conversations" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 flex items-center justify-center px-1 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <BusinessAccessSection />

            <Card className="p-4 sm:p-6 max-w-full overflow-hidden">
              <div className="flex items-center justify-between mb-6 min-w-0 gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold flex items-center gap-2 truncate">
                    <Users className="h-5 w-5 flex-shrink-0" />
                    {t('team.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    Manage team members • {members?.length || 0} member{(members?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <RequireRole role="owner" fallback={null}>
                {(members?.length || 0) >= 5 && (
                  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-800 truncate">
                          Team size limit reached
                        </p>
                        <p className="text-xs text-orange-700 truncate">
                          Using {members?.length || 0} of 5 seats
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100 flex-shrink-0 hidden sm:flex">
                        Upgrade Plan
                      </Button>
                    </div>
                  </div>
                )}
              </RequireRole>

              <div className="w-full">
                <div className="mb-4">
                  <h4 className="text-lg font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members ({sortedMembers.length})
                  </h4>
                </div>
                <div className="space-y-3 mt-4">
                  {sortedMembers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium mb-2">No team members yet</p>
                      <RequireRole role="owner" fallback={null}>
                        <p className="text-sm">Invite workers to collaborate on jobs</p>
                      </RequireRole>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedMembers.map((member) => (
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
                                    active
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              {member.joined_at ? (
                                <span className="truncate">Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                              ) : member.invited_at ? (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  Invited {new Date(member.invited_at).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  Pending
                                </span>
                              )}
                              {member.name && (
                                <span className="truncate">• {member.name}</span>
                              )}
                              {role === 'owner' && member.user_id && (
                                <span className="text-primary">• Click to view timesheet</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <TeamMemberActions
                              member={member}
                              businessId={businessId || ''}
                              isLastOwner={member.role === 'owner' && ownerCount === 1}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <CardTitle>Team Availability</CardTitle>
                <p className="text-sm text-muted-foreground">Manage weekly availability schedules</p>
              </CardHeader>
              <CardContent>
                <TeamAvailabilitySchedule />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Off Tab */}
          <TabsContent value="timeoff">
            <Card>
              <CardHeader>
                <CardTitle>Time Off Requests</CardTitle>
                <p className="text-sm text-muted-foreground">Submit and manage time off requests</p>
              </CardHeader>
              <CardContent>
                <TimeOffManagement isManager={role === 'owner'} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recurring Jobs Tab */}
          <TabsContent value="recurring" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recurring Job Templates</CardTitle>
                    <p className="text-sm text-muted-foreground">Automate recurring service schedules</p>
                  </div>
                  {recurringTemplates && recurringTemplates.length > 0 && (
                    <ToggleGroup 
                      type="single" 
                      value={recurringView}
                      onValueChange={(value) => {
                        if (value) {
                          setSearchParams({ tab: activeTab, view: value });
                        }
                      }}
                    >
                      <ToggleGroupItem value="list" aria-label="List view">
                        <List className="h-4 w-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="map" aria-label="Map view">
                        <MapIcon className="h-4 w-4" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {recurringTemplates?.length === 0 && !isLoadingRecurring ? (
                  <div className="text-center py-12">
                    <Repeat className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">No Recurring Jobs Yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create templates to automate recurring service schedules
                    </p>
                    <Button onClick={() => setIsRecurringModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Template
                    </Button>
                  </div>
                ) : recurringView === 'map' ? (
                  <div className="h-[600px] rounded-lg overflow-hidden">
                    <RecurringJobsMapView 
                      templates={recurringTemplates || []}
                      onTemplateClick={(template) => {
                        console.log('Template clicked:', template);
                      }}
                    />
                  </div>
                ) : (
                  <RecurringJobsList
                    templates={recurringTemplates || []}
                    isLoading={isLoadingRecurring}
                    onPreviewRoute={() => setShowRouteOptimizer(true)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management</CardTitle>
                <p className="text-sm text-muted-foreground">Track supplies, chemicals, and equipment</p>
              </CardHeader>
              <CardContent>
                <InventoryManagement />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations">
            <ConversationsTab />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <EnhancedInviteModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          businessId={businessId || ''}
        />

        <RecurringJobModal
          isOpen={isRecurringModalOpen}
          onClose={() => setIsRecurringModalOpen(false)}
        />

        <InventoryItemModal
          open={isInventoryModalOpen}
          onClose={() => setIsInventoryModalOpen(false)}
          onSave={() => setIsInventoryModalOpen(false)}
        />

        {showRouteOptimizer && (
          <RouteOptimizer
            templates={recurringTemplates || []}
            onClose={() => setShowRouteOptimizer(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}