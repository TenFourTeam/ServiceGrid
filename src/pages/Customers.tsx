import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronUp, ChevronDown, Download, CheckCircle, FileText, Globe, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Papa from 'papaparse';
import { formatDate } from '@/utils/format';
import { formatDistanceToNow } from 'date-fns';
import { CustomerBottomModal } from '@/components/Customers/CustomerBottomModal';
import { CustomerSearchFilter } from '@/components/Customers/CustomerSearchFilter';
import { CustomerActions } from '@/components/Customers/CustomerActions';
import { useState, useMemo, useEffect, useCallback } from "react";
import { useCustomersData } from '@/queries/unified';
import { useRequestsData } from '@/hooks/useRequestsData';
import { useIsMobile } from "@/hooks/use-mobile";
import { SimpleCSVImport } from '@/components/Onboarding/SimpleCSVImport';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomerOperations } from '@/hooks/useCustomerOperations';
import CustomerErrorBoundary from '@/components/ErrorBoundaries/CustomerErrorBoundary';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLeadSourceLabel, getLeadSourceColor } from '@/lib/lead-sources';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useLeadActionQueue } from '@/hooks/useLeadActionQueue';
import { cn } from '@/lib/utils';

export default function CustomersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: customers, isLoading, error } = useCustomersData();
  const { data: requestsResponse } = useRequestsData();
  
  // Build a map of customer_id -> request count
  const requestCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (requestsResponse?.data) {
      requestsResponse.data.forEach(request => {
        const count = map.get(request.customer_id) || 0;
        map.set(request.customer_id, count + 1);
      });
    }
    return map;
  }, [requestsResponse?.data]);
  const { t } = useLanguage();
  
  const [open, setOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('view');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  
  const { deleteCustomer, isDeletingCustomer } = useCustomerOperations();
  const { prefetchCustomerViewModal, prefetchNewCustomerModal } = usePrefetch();
  const { pendingCount, failedCount, isOnline, retryFailed } = useLeadActionQueue();
  
  // Search and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [qualificationFilter, setQualificationFilter] = useState<'all' | 'qualified' | 'unqualified'>('all');
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'email' | 'phone' | 'lead_score' | 'lead_source';
    direction: 'asc' | 'desc';
  } | null>(null);
  
  // Prefetch on row hover
  const handleRowHover = useCallback((customerId: string) => {
    prefetchCustomerViewModal(customerId);
  }, [prefetchCustomerViewModal]);

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers || [];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.name?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query)
      );
    }
    
    // Apply qualification filter
    if (qualificationFilter === 'qualified') {
      filtered = filtered.filter(customer => customer.is_qualified === true);
    } else if (qualificationFilter === 'unqualified') {
      filtered = filtered.filter(customer => customer.is_qualified !== true);
    }
    
    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        if (sortConfig.key === 'lead_score') {
          const aScore = a.lead_score ?? 0;
          const bScore = b.lead_score ?? 0;
          return sortConfig.direction === 'asc' ? aScore - bScore : bScore - aScore;
        }
        
        const aValue = (a[sortConfig.key as keyof typeof a] as string) || '';
        const bValue = (b[sortConfig.key as keyof typeof b] as string) || '';
        
        if (sortConfig.direction === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });
    }
    
    return filtered;
  }, [customers, searchQuery, qualificationFilter, sortConfig]);
  
  const rows = filteredAndSortedCustomers;

  function openNew() {
    setEditingId(null);
    setModalMode('create');
    setOpen(true);
  }

  function openView(c: any) {
    setEditingId(c.id);
    setModalMode('view');
    setOpen(true);
  }

  function openEdit(c: any) {
    setEditingId(c.id);
    setModalMode('edit');
    setOpen(true);
  }

  // Check for URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    if (params.get('import') === '1') {
      setCsvImportOpen(true);
      navigate('/customers', { replace: true });
    } else if (params.get('new') === '1') {
      openNew();
      navigate('/customers', { replace: true });
    }
  }, [location.search, navigate]);

  function openDeleteDialog(customer: any) {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  }

  const handleEditCustomer = (customer: any) => {
    openEdit(customer);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    deleteCustomer.mutate(customerToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
        setOpen(false); // Close modal if open
      }
    });
  };

  const handleSort = (key: 'name' | 'email' | 'phone' | 'lead_score' | 'lead_source') => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: key === 'lead_score' ? 'desc' : 'asc' };
      } else if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      } else {
        return null; // Clear sorting
      }
    });
  };
  
  const getSortIcon = (key: 'name' | 'email' | 'phone' | 'lead_score' | 'lead_source') => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="h-4 w-4 ml-1" /> : 
      <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const handleExportCSV = () => {
    if (filteredAndSortedCustomers.length === 0) return;

    const csvData = filteredAndSortedCustomers.map(customer => ({
      [t('customers.table.name')]: customer.name || '',
      [t('customers.table.email')]: customer.email || '',
      [t('customers.table.phone')]: customer.phone || '',
      [t('customers.table.address')]: customer.address || '',
      'Notes': customer.notes || '',
      'Created Date': formatDate(customer.created_at)
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `customers-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Customer Card component for mobile view
  function CustomerCard({ customer, onClick, onHover }: { 
    customer: any; 
    onClick: () => void;
    onHover?: () => void;
  }) {
    return (
      <div 
        onClick={onClick}
        onMouseEnter={onHover}
        className={cn(
          "relative p-4 border rounded-md bg-card shadow-sm cursor-pointer",
          "transition-all duration-200 ease-out",
          "hover:translate-y-[-2px] hover:shadow-md hover:bg-accent/30",
          "active:translate-y-0 active:shadow-sm",
          customer._optimistic && "opacity-70 border-dashed animate-optimistic-pulse"
        )}
      >
        {/* Actions menu positioned absolutely halfway up the right edge */}
        <div className="absolute top-1/2 right-2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
          <CustomerActions 
            customer={customer}
            onEdit={handleEditCustomer}
            onDelete={openDeleteDialog}
          />
        </div>
        
        {/* Content area with proper padding to avoid overlap */}
        <div className="pr-20 pb-8">
          <div className="font-medium truncate">{customer.name}</div>
          <div className="text-sm text-muted-foreground truncate">
            {customer.email}
          </div>
          {customer.phone && (
            <div className="text-sm text-muted-foreground truncate">
              {customer.phone}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {customer.address || t('customers.noAddressProvided')}
          </div>
          {customer.created_at && (
            <div className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}
            </div>
          )}
          {/* Lead Score & Source Badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={(customer.lead_score ?? 0) >= 40 ? "default" : "secondary"} className="text-xs">
              Score: {customer.lead_score ?? 0}
            </Badge>
            {customer.is_qualified && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Qualified
              </Badge>
            )}
            {customer.lead_source && (
              <Badge variant="outline" className={`text-xs ${getLeadSourceColor(customer.lead_source)}`}>
                <Globe className="h-3 w-3 mr-1" />
                {getLeadSourceLabel(customer.lead_source)}
              </Badge>
            )}
            {requestCountMap.get(customer.id) > 0 && (
              <Badge 
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/requests?customer=${customer.id}`);
                }}
              >
                <FileText className="h-3 w-3 mr-1" />
                {requestCountMap.get(customer.id)} request(s)
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isMobile = useIsMobile();

  return (
    <AppLayout title={t('customers.title')}>
      <section className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle>{t('customers.cardTitle')}</CardTitle>
              {/* Offline/Pending indicator */}
              {(pendingCount > 0 || failedCount > 0 || !isOnline) && (
                <div className="flex items-center gap-2">
                  {!isOnline && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="animate-pulse">
                      {pendingCount} syncing...
                    </Badge>
                  )}
                  {failedCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="cursor-pointer"
                      onClick={retryFailed}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {failedCount} failed - retry
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setCsvImportOpen(true)} className="w-full sm:w-auto">
                {t('customers.importCsv')}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                disabled={filteredAndSortedCustomers.length === 0}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('customers.exportCsv')}
              </Button>
              <Button 
                onClick={() => openNew()} 
                onMouseEnter={prefetchNewCustomerModal}
                className="w-full sm:w-auto"
              >
                {t('customers.newCustomer')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <CustomerSearchFilter
                onSearch={setSearchQuery}
                onQualificationFilter={setQualificationFilter}
                activeFilters={{ search: searchQuery, qualification: qualificationFilter }}
              />
              
              {rows.length === 0 && searchQuery && (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    {t('customers.emptyStates.noResults', { query: searchQuery })}
                  </div>
                </div>
              )}
              
              {isLoading ? (
                <div className="text-muted-foreground">{t('customers.loading')}</div>
              ) : error ? (
                <div className="text-destructive">{t('customers.error', { message: error.message })}</div>
              ) : rows.length > 0 ? (
                <CustomerErrorBoundary>
                  {isMobile ? (
                    // Mobile/Tablet Card View
                    <div className="space-y-3">
                      {rows.map((c) => (
                        <CustomerCard
                          key={c.id}
                          customer={c}
                          onClick={() => openView(c)}
                          onHover={() => handleRowHover(c.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    // Desktop Table View
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center">
                              {t('customers.table.name')}
                              {getSortIcon('name')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('email')}
                          >
                            <div className="flex items-center">
                              {t('customers.table.email')}
                              {getSortIcon('email')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('phone')}
                          >
                            <div className="flex items-center">
                              {t('customers.table.phone')}
                              {getSortIcon('phone')}
                            </div>
                          </TableHead>
                          <TableHead>{t('customers.table.address')}</TableHead>
                          <TableHead>Requests</TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('lead_score')}
                          >
                            <div className="flex items-center">
                              Lead Score
                              {getSortIcon('lead_score')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('lead_source')}
                          >
                            <div className="flex items-center">
                              Source
                              {getSortIcon('lead_source')}
                            </div>
                          </TableHead>
                          <TableHead className="w-12">{t('customers.table.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((c) => (
                          <TableRow 
                            key={c.id}
                            className={cn(
                              "cursor-pointer transition-all duration-200",
                              "hover:bg-muted/50 hover:translate-y-[-1px]",
                              c._optimistic && "opacity-70 animate-optimistic-pulse"
                            )}
                            onClick={() => openView(c)}
                            onMouseEnter={() => handleRowHover(c.id)}
                          >
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.email ?? ''}</TableCell>
                            <TableCell>{c.phone ?? ''}</TableCell>
                            <TableCell>{c.address ?? ''}</TableCell>
                            <TableCell>
                              {requestCountMap.get(c.id) ? (
                                <Badge 
                                  variant="outline" 
                                  className="cursor-pointer hover:bg-muted"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/requests?customer=${c.id}`);
                                  }}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  {requestCountMap.get(c.id)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium">{c.lead_score ?? 0}</span>
                                  <Progress value={c.lead_score ?? 0} className="h-1.5 w-12" />
                                </div>
                                {c.is_qualified && (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                                    <CheckCircle className="h-3 w-3" />
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {c.lead_source ? (
                                <Badge variant="outline" className={`text-xs ${getLeadSourceColor(c.lead_source)}`}>
                                  {getLeadSourceLabel(c.lead_source)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <CustomerActions 
                                customer={c}
                                onEdit={handleEditCustomer}
                                onDelete={openDeleteDialog}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CustomerErrorBoundary>
              ) : !searchQuery && customers?.length === 0 ? (
                <div className="text-center py-12">
                  <div className="space-y-3">
                    <div className="text-4xl">👥</div>
                    <div className="text-lg font-medium">{t('customers.emptyStates.title')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('customers.emptyStates.description')}
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => openNew()}>
                        {t('customers.addCustomer')}
                      </Button>
                      <Button variant="outline" onClick={() => setCsvImportOpen(true)}>
                        {t('customers.importCsv')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <CustomerBottomModal
        open={open}
        onOpenChange={setOpen}
        customer={editingId ? rows.find(c => c.id === editingId) : null}
        mode={modalMode}
        onEdit={handleEditCustomer}
        onDelete={openDeleteDialog}
      />

      <SimpleCSVImport
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onImportComplete={(count) => {
          // Customers list will auto-refresh due to query invalidation
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('customers.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('customers.deleteDialog.description', { name: customerToDelete?.name })}
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="text-sm font-medium text-destructive">
                  {t('customers.deleteDialog.warningTitle')}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  • {t('customers.deleteDialog.warningItems.0')}
                  <br />
                  • {t('customers.deleteDialog.warningItems.1')}
                  <br />
                  • {t('customers.deleteDialog.warningItems.2')}
                  <br />
                  • {t('customers.deleteDialog.warningItems.3')}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCustomer}>
              {t('customers.deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCustomer}
              disabled={isDeletingCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingCustomer ? t('customers.deleteDialog.deleting') : t('customers.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}