import { useState, useMemo } from "react";
import { Plus, Search, Share, UserCircle, Filter, Globe, TrendingUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import AppLayout from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequestsData, RequestListItem } from "@/hooks/useRequestsData";
import { useCustomersData } from "@/hooks/useCustomersData";
import { RequestBottomModal } from "@/components/Requests/RequestBottomModal";
import { RequestShowModal } from "@/components/Requests/RequestShowModal";
import { RequestShareModal } from "@/components/Requests/RequestShareModal";
import { RequestActions } from "@/components/Requests/RequestActions";
import { AIScheduleSuggestions } from "@/components/Calendar/AIScheduleSuggestions";
import { AppointmentChangeRequestsCard } from "@/components/Requests/AppointmentChangeRequestsCard";
import { LeadMetricsCard } from "@/components/Dashboard/LeadMetricsCard";
import { useBusinessMembersData } from "@/hooks/useBusinessMembers";
import { useJobsData } from "@/hooks/useJobsData";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { statusOptions } from "@/validation/requests";
import { useLanguage } from "@/contexts/LanguageContext";
import { LEAD_SOURCES, getLeadSourceLabel } from "@/lib/lead-sources";

export default function Requests() {
  const { t } = useLanguage();
  const { businessId, profileId } = useBusinessContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedRequest, setSelectedRequest] = useState<RequestListItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShowModalOpen, setIsShowModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // New filter states
  const [assignedToMeFilter, setAssignedToMeFilter] = useState(false);
  const [leadScoreFilter, setLeadScoreFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>('all');
  
  // Sorting state
  const [sortKey, setSortKey] = useState<'customer' | 'title' | 'property' | 'contact' | 'status' | 'created'>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: requestsResponse, isLoading, error } = useRequestsData();
  const { data: customers = [] } = useCustomersData();
  const { data: membersData } = useBusinessMembersData();
  const { data: jobsData } = useJobsData(businessId);
  const requests = useMemo(() => requestsResponse?.data || [], [requestsResponse]);
  
  // Create maps for customer data
  const customerScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach(c => map.set(c.id, c.lead_score ?? 0));
    return map;
  }, [customers]);
  
  const customerSourceMap = useMemo(() => {
    const map = new Map<string, string | null>();
    customers.forEach(c => map.set(c.id, c.lead_source || null));
    return map;
  }, [customers]);
  
  // Count requests assigned to current user
  const assignedToMeCount = useMemo(() => {
    if (!profileId) return 0;
    return requests.filter(r => r.assigned_to === profileId).length;
  }, [requests, profileId]);

  // Sorting logic
  function handleSort(key: 'customer' | 'title' | 'property' | 'contact' | 'status' | 'created') {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir(key === 'created' ? 'desc' : 'asc'); // Default created to desc (newest first)
      return key;
    });
  }

  const sortedRequests = useMemo(() => {
    const arr = [...requests];
    const baseCompare = (a: RequestListItem, b: RequestListItem) => {
      if (sortKey === 'customer') return (a.customer?.name || '').localeCompare(b.customer?.name || '');
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      if (sortKey === 'property') return (a.property_address || '').localeCompare(b.property_address || '');
      if (sortKey === 'contact') return (a.customer?.email || '').localeCompare(b.customer?.email || '');
      if (sortKey === 'status') return a.status.localeCompare(b.status);
      if (sortKey === 'created') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return 0;
    };
    arr.sort((a, b) => (sortDir === 'asc' ? baseCompare(a, b) : -baseCompare(a, b)));
    return arr;
  }, [requests, sortKey, sortDir]);

  // Filter requests based on search query, status, and new filters
  const filteredRequests = sortedRequests.filter((request) => {
    const customerName = request.customer?.name || '';
    const matchesSearch = 
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.property_address?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    // For "All", exclude archived requests. For specific status, match exactly.
    const matchesStatus = selectedStatus === "All" 
      ? request.status !== "Archived"
      : request.status === selectedStatus;
    
    // Assigned to me filter
    const matchesAssignedToMe = !assignedToMeFilter || request.assigned_to === profileId;
    
    // Lead score filter
    const customerScore = customerScoreMap.get(request.customer_id) ?? 0;
    let matchesLeadScore = true;
    if (leadScoreFilter === 'hot') matchesLeadScore = customerScore >= 70;
    else if (leadScoreFilter === 'warm') matchesLeadScore = customerScore >= 40 && customerScore < 70;
    else if (leadScoreFilter === 'cold') matchesLeadScore = customerScore < 40;
    
    // Lead source filter
    const customerSource = customerSourceMap.get(request.customer_id);
    const matchesLeadSource = leadSourceFilter === 'all' || customerSource === leadSourceFilter;
    
    return matchesSearch && matchesStatus && matchesAssignedToMe && matchesLeadScore && matchesLeadSource;
  });

  // Calculate counts for each status (exclude archived from "All" count)
  const nonArchivedRequests = requests.filter(request => request.status !== 'Archived');
  const counts = {
    All: nonArchivedRequests.length,
    ...statusOptions.reduce((acc, status) => {
      acc[status.value] = requests.filter(request => request.status === status.value).length;
      return acc;
    }, {} as Record<string, number>)
  };

  // Prepare unscheduled requests for AI scheduling
  const unscheduledRequests = requests.filter(r => r.status === 'New' || r.status === 'Reviewed') || [];
  const unscheduledJobs = useMemo(() => 
    unscheduledRequests.map(r => ({
      id: r.id,
      title: r.title,
      customerId: r.customer_id,
      address: r.property_address,
      priority: 3, // default priority
      estimatedDurationMinutes: 60, // default 1 hour
      businessId: businessId || '',
      ownerId: r.owner_id
    })),
    [unscheduledRequests, businessId]
  );

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'New': t('requests.status.new'),
      'Scheduled': t('requests.status.scheduled'),
      'Assessed': t('requests.status.assessed'),
      'Archived': t('requests.status.archived')
    };
    
    const statusOption = statusOptions.find(option => option.value === status);
    if (!statusOption) return null;
    
    return (
      <Badge variant="secondary" className={statusOption.color}>
        {statusMap[status] || statusOption.label}
      </Badge>
    );
  };

  // Request Card component for mobile view
  function RequestCard({ request, onClick }: { request: RequestListItem; onClick: () => void }) {
    return (
      <div 
        onClick={onClick}
        className="relative p-4 border rounded-md bg-card shadow-sm cursor-pointer hover:bg-accent/30 transition-colors"
      >
        {/* Status badge positioned absolutely in top-right corner */}
        <div className="absolute top-2 right-2">
          {getStatusBadge(request.status)}
        </div>
        
        {/* Three-dot menu positioned absolutely halfway up the right edge */}
        <div className="absolute top-1/2 right-2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
          <RequestActions request={request} />
        </div>
        
        <div className="pr-20 pb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium truncate">{request.title}</div>
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {t('requests.table.customer')}: {request.customer?.name || t('requests.table.customer')}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </div>
          <div className="text-sm text-muted-foreground mt-1 truncate">
            {request.property_address || t('requests.noAddressProvided')}
          </div>
          {/* Assigned To */}
          {request.assigned_user ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <UserCircle className="h-3 w-3" />
              <span className="truncate">{request.assigned_user.display_name || request.assigned_user.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/50 mt-1">
              <UserCircle className="h-3 w-3" />
              <span>{t('requests.unassigned') || 'Unassigned'}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isMobile = useIsMobile();

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <p className="text-destructive">{t('requests.error')}: {error.message}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen flex w-full">
      <AppLayout title={t('requests.title')}>
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>{t('requests.allRequests')}</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsShareModalOpen(true)} className="w-full sm:w-auto">
                    <Share className="h-4 w-4 mr-2" />
                    {t('requests.shareRequestForm')}
                  </Button>
                  <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('requests.newRequest')}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('requests.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="w-48">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">{t('requests.status.all')} ({counts.All})</SelectItem>
                    {statusOptions.map((status) => {
                      const statusMap: Record<string, string> = {
                        'New': t('requests.status.new'),
                        'Scheduled': t('requests.status.scheduled'),
                        'Assessed': t('requests.status.assessed'),
                        'Archived': t('requests.status.archived')
                      };
                      return (
                        <SelectItem key={status.value} value={status.value}>
                          {statusMap[status.value] || status.label} ({counts[status.value]})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Advanced Filters Row */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Assigned to Me Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="assigned-to-me"
                  checked={assignedToMeFilter}
                  onCheckedChange={setAssignedToMeFilter}
                />
                <Label htmlFor="assigned-to-me" className="text-sm cursor-pointer">
                  <UserCircle className="h-4 w-4 inline mr-1" />
                  Assigned to Me
                  {assignedToMeCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{assignedToMeCount}</Badge>
                  )}
                </Label>
              </div>
              
              {/* Lead Score Filter */}
              <div className="w-36">
                <Select value={leadScoreFilter} onValueChange={(v) => setLeadScoreFilter(v as typeof leadScoreFilter)}>
                  <SelectTrigger className="h-9">
                    <TrendingUp className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Lead Score" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leads</SelectItem>
                    <SelectItem value="hot">🔥 Hot (70+)</SelectItem>
                    <SelectItem value="warm">☀️ Warm (40-69)</SelectItem>
                    <SelectItem value="cold">❄️ Cold (0-39)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Lead Source Filter */}
              <div className="w-40">
                <Select value={leadSourceFilter} onValueChange={setLeadSourceFilter}>
                  <SelectTrigger className="h-9">
                    <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {LEAD_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Clear Filters */}
              {(assignedToMeFilter || leadScoreFilter !== 'all' || leadSourceFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAssignedToMeFilter(false);
                    setLeadScoreFilter('all');
                    setLeadSourceFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Lead Metrics Summary */}
          <LeadMetricsCard />

          {/* Customer Appointment Change Requests */}
          <AppointmentChangeRequestsCard />

          {/* AI Scheduling Suggestions */}
          {unscheduledJobs.length > 0 && businessId && (
            <AIScheduleSuggestions
              unscheduledJobs={unscheduledJobs}
              existingJobs={jobsData?.data || []}
              teamMembers={membersData?.data || []}
              businessId={businessId}
              onJobScheduled={() => {
                // Suggestions are informational - users create jobs via JobBottomModal
              }}
            />
          )}

          {/* Requests Content */}
          {isMobile ? (
            // Mobile/Tablet Card View
            <Card>
              <CardContent className="p-3 space-y-3">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">
                      {searchQuery || selectedStatus !== "All" 
                        ? t('requests.empty.noResults')
                        : t('requests.empty.noRequests')
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {!searchQuery && selectedStatus === "All" 
                        ? t('requests.empty.noRequestsDescription')
                        : t('requests.empty.tryDifferentSearch')
                      }
                    </p>
                    {!searchQuery && selectedStatus === "All" && (
                      <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('requests.newRequest')}
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsShowModalOpen(true);
                      }}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            // Desktop Table View
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">
                      {searchQuery || selectedStatus !== "All" 
                        ? t('requests.empty.noResults')
                        : t('requests.empty.noRequests')
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {!searchQuery && selectedStatus === "All" 
                        ? t('requests.empty.noRequestsDescription')
                        : t('requests.empty.tryDifferentSearch')
                      }
                    </p>
                    {!searchQuery && selectedStatus === "All" && (
                      <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('requests.newRequest')}
                      </Button>
                    )}
                  </div>
                ) : (
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button className="flex items-center gap-1" onClick={() => handleSort('customer')} aria-label="Sort by customer">
                            {t('requests.table.customer')}{sortKey === 'customer' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="flex items-center gap-1" onClick={() => handleSort('title')} aria-label="Sort by title">
                            {t('requests.table.title')}{sortKey === 'title' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="flex items-center gap-1" onClick={() => handleSort('property')} aria-label="Sort by property">
                            {t('requests.table.property')}{sortKey === 'property' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="flex items-center gap-1" onClick={() => handleSort('contact')} aria-label="Sort by contact">
                            {t('requests.table.contact')}{sortKey === 'contact' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="flex items-center gap-1" onClick={() => handleSort('created')} aria-label="Sort by requested date">
                            {t('requests.table.requested')}{sortKey === 'created' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="flex items-center gap-1" onClick={() => handleSort('status')} aria-label="Sort by status">
                            {t('requests.table.status')}{sortKey === 'status' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                        </TableHead>
                        <TableHead>{t('requests.table.assignedTo') || 'Assigned To'}</TableHead>
                        <TableHead>{t('requests.table.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow
                          key={request.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsShowModalOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">
                            {request.customer?.name || t('requests.table.customer')}
                          </TableCell>
                          <TableCell>{request.title}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {request.property_address || t('requests.noAddressProvided')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {request.customer?.email || t('requests.table.contact')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(request.status)}
                          </TableCell>
                          <TableCell>
                            {request.assigned_user ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {request.assigned_user.email?.[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate max-w-[120px]">
                                  {request.assigned_user.display_name || request.assigned_user.email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">{t('requests.unassigned') || 'Unassigned'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <RequestActions request={request} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>

      {/* Modals */}
      <RequestBottomModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onRequestCreated={() => {
          // Request will be automatically refreshed via query invalidation
        }}
      />
      
      <RequestShowModal
        request={selectedRequest}
        open={isShowModalOpen}
        onOpenChange={(open) => {
          setIsShowModalOpen(open);
          if (!open) {
            setSelectedRequest(null);
          }
        }}
        onRequestUpdated={() => {
          // Request will be automatically refreshed via query invalidation
        }}
      />
      
      <RequestShareModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
      />
    </div>
  );
}