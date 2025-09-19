import { useState, useMemo } from "react";
import { Plus, Search, Share } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import AppLayout from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequestsData, RequestListItem } from "@/hooks/useRequestsData";
import { RequestBottomModal } from "@/components/Requests/RequestBottomModal";
import { RequestShowModal } from "@/components/Requests/RequestShowModal";
import { RequestShareModal } from "@/components/Requests/RequestShareModal";
import { RequestActions } from "@/components/Requests/RequestActions";
import { statusOptions } from "@/validation/requests";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Requests() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedRequest, setSelectedRequest] = useState<RequestListItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShowModalOpen, setIsShowModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Sorting state
  const [sortKey, setSortKey] = useState<'customer' | 'title' | 'property' | 'contact' | 'status' | 'created'>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: requestsResponse, isLoading, error } = useRequestsData();
  const requests = requestsResponse?.data || [];

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

  // Filter requests based on search query and status
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
    
    return matchesSearch && matchesStatus;
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
        className="p-4 border rounded-md bg-card shadow-sm cursor-pointer hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-medium truncate">{request.title}</div>
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {t('requests.table.customer')}: {request.customer?.name || t('requests.table.customer')}
            </div>
            {request.property_address && (
              <div className="text-sm text-muted-foreground truncate">{request.property_address}</div>
            )}
            <div className="text-sm text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {getStatusBadge(request.status)}
              <div onClick={(e) => e.stopPropagation()}>
                <RequestActions request={request} />
              </div>
            </div>
          </div>
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
          <div className="flex gap-4 items-center">
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
                            {request.property_address || t('requests.empty.noResults')}
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