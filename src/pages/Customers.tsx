import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronUp, ChevronDown, Download } from 'lucide-react';
import Papa from 'papaparse';
import { formatDate } from '@/utils/format';
import { formatDistanceToNow } from 'date-fns';
import { CustomerBottomModal } from '@/components/Customers/CustomerBottomModal';
import { CustomerSearchFilter } from '@/components/Customers/CustomerSearchFilter';
import { CustomerActions } from '@/components/Customers/CustomerActions';
import { useState, useMemo, useEffect } from "react";
import { useCustomersData } from '@/queries/unified';
import { useIsMobile } from "@/hooks/use-mobile";
import { SimpleCSVImport } from '@/components/Onboarding/SimpleCSVImport';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomerOperations } from '@/hooks/useCustomerOperations';
import CustomerErrorBoundary from '@/components/ErrorBoundaries/CustomerErrorBoundary';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CustomersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: customers, isLoading, error } = useCustomersData();
  const { t } = useLanguage();
  
  const [open, setOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('view');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  
  const { deleteCustomer, isDeletingCustomer } = useCustomerOperations();
  
  // Search and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'email' | 'phone';
    direction: 'asc' | 'desc';
  } | null>(null);

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
    
    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (sortConfig.direction === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });
    }
    
    return filtered;
  }, [customers, searchQuery, sortConfig]);
  
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

  const handleSort = (key: 'name' | 'email' | 'phone') => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      } else if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      } else {
        return null; // Clear sorting
      }
    });
  };
  
  const getSortIcon = (key: 'name' | 'email' | 'phone') => {
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
  function CustomerCard({ customer, onClick }: { 
    customer: any; 
    onClick: () => void; 
  }) {
    return (
      <div 
        onClick={onClick}
        className="relative p-4 border rounded-md bg-card shadow-sm cursor-pointer hover:bg-accent/30 transition-colors"
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
            <CardTitle>{t('customers.cardTitle')}</CardTitle>
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
              <Button onClick={() => openNew()} className="w-full sm:w-auto">
                {t('customers.newCustomer')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <CustomerSearchFilter
                onSearch={setSearchQuery}
                activeFilters={{ search: searchQuery }}
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
                          <TableHead className="w-12">{t('customers.table.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((c) => (
                          <TableRow 
                            key={c.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => openView(c)}
                          >
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.email ?? ''}</TableCell>
                            <TableCell>{c.phone ?? ''}</TableCell>
                            <TableCell>{c.address ?? ''}</TableCell>
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