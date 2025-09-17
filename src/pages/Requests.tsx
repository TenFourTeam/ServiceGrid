import { useState } from "react";
import { Plus, Search, Share } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AppLayout from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export default function Requests() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedRequest, setSelectedRequest] = useState<RequestListItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShowModalOpen, setIsShowModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const { data: requests = [], isLoading, error } = useRequestsData();

  // Filter requests based on search query and status
  const filteredRequests = requests.filter((request) => {
    const customerName = request.customer?.name || '';
    const matchesSearch = 
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.property_address?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    const matchesStatus = selectedStatus === "All" || request.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status);
    if (!statusOption) return null;
    
    return (
      <Badge variant="secondary" className={statusOption.color}>
        {statusOption.label}
      </Badge>
    );
  };

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <p className="text-destructive">Error loading requests: {error.message}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen flex w-full">
      <AppLayout title="Requests">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Requests</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsShareModalOpen(true)}>
                    <Share className="h-4 w-4 mr-2" />
                    Share Request Form
                  </Button>
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
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
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === "All" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("All")}
              >
                All
              </Button>
              {statusOptions.map((status) => (
                <Button
                  key={status.value}
                  variant={selectedStatus === status.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(status.value)}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Requests Table */}
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
                      ? "No requests match your filters"
                      : "No requests yet"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {!searchQuery && selectedStatus === "All" 
                      ? "Create your first request to get started"
                      : "Try adjusting your search or filters"
                    }
                  </p>
                  {!searchQuery && selectedStatus === "All" && (
                    <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Request
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customers</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
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
                          {request.customer?.name || 'Unknown Customer'}
                        </TableCell>
                        <TableCell>{request.title}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {request.property_address || 'No address provided'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {request.customer?.email || 'No email'}
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