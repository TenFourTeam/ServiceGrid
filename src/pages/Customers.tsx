import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, ChevronUp, ChevronDown, Download } from 'lucide-react';
import Papa from 'papaparse';
import { formatDate } from '@/utils/format';
import { CustomerBottomModal } from '@/components/Customers/CustomerBottomModal';
import { CustomerSearchFilter } from '@/components/Customers/CustomerSearchFilter';
import { useState, useMemo, useEffect } from "react";
import { useCustomersData } from '@/queries/unified';
import { useIsMobile } from "@/hooks/use-mobile";
import { SimpleCSVImport } from '@/components/Onboarding/SimpleCSVImport';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomerOperations } from '@/hooks/useCustomerOperations';
import CustomerErrorBoundary from '@/components/ErrorBoundaries/CustomerErrorBoundary';
import { Checkbox } from "@/components/ui/checkbox";

export default function CustomersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: customers, isLoading, error } = useCustomersData();
  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  const { deleteCustomer, isDeletingCustomer, bulkDeleteCustomers, isBulkDeleting } = useCustomerOperations();
  
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
    setOpen(true);
  }

  function openEdit(c: any) {
    setEditingId(c.id);
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

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    deleteCustomer.mutate(customerToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(new Set(filteredAndSortedCustomers.map(c => c.id)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    const newSelected = new Set(selectedCustomers);
    if (checked) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedCustomers.size === 0) return;
    bulkDeleteCustomers.mutate(Array.from(selectedCustomers), {
      onSuccess: () => {
        setSelectedCustomers(new Set());
        setShowBulkDeleteDialog(false);
      }
    });
  };

  const handleExportCSV = () => {
    if (filteredAndSortedCustomers.length === 0) return;

    const csvData = filteredAndSortedCustomers.map(customer => ({
      'Customer Name': customer.name || '',
      'Email': customer.email || '',
      'Phone': customer.phone || '',
      'Address': customer.address || '',
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
  function CustomerCard({ customer, onClick, isSelected, onSelect }: { 
    customer: any; 
    onClick: () => void; 
    isSelected: boolean;
    onSelect: (checked: boolean) => void;
  }) {
    return (
      <div className="p-4 border rounded-md bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
            />
          </div>
          <div 
            onClick={onClick}
            className="min-w-0 flex-1 cursor-pointer hover:bg-accent/30 transition-colors rounded p-2 -m-2"
          >
            <div className="font-medium truncate">{customer.name}</div>
            <div className="text-sm text-muted-foreground truncate">{customer.email || ''}</div>
            <div className="text-sm text-muted-foreground truncate">{customer.phone || ''}</div>
          </div>
        </div>
      </div>
    );
  }

  const isMobile = useIsMobile();

  return (
    <AppLayout title="Customers">
      <section className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>All Customers</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {selectedCustomers.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                  disabled={isBulkDeleting}
                  className="w-full sm:w-auto"
                >
                  Delete {selectedCustomers.size} customer{selectedCustomers.size === 1 ? '' : 's'}
                </Button>
              )}
              <Button variant="outline" onClick={() => setCsvImportOpen(true)} className="w-full sm:w-auto">
                Import CSV
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                disabled={filteredAndSortedCustomers.length === 0}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => openNew()} className="w-full sm:w-auto">
                New Customer
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
                    No customers found matching "{searchQuery}"
                  </div>
                </div>
              )}
              
              {isLoading ? (
                <div className="text-muted-foreground">Loading customers…</div>
              ) : error ? (
                <div className="text-destructive">Error loading customers: {error.message}</div>
              ) : rows.length > 0 ? (
                <CustomerErrorBoundary>
                  {isMobile ? (
                    // Mobile/Tablet Card View
                    <div className="space-y-3">
                      {rows.map((c) => (
                        <CustomerCard
                          key={c.id}
                          customer={c}
                          onClick={() => openEdit(c)}
                          isSelected={selectedCustomers.has(c.id)}
                          onSelect={(checked) => handleSelectCustomer(c.id, checked)}
                        />
                      ))}
                    </div>
                  ) : (
                    // Desktop Table View
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedCustomers.size === filteredAndSortedCustomers.length && filteredAndSortedCustomers.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center">
                              Name
                              {getSortIcon('name')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('email')}
                          >
                            <div className="flex items-center">
                              Email
                              {getSortIcon('email')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('phone')}
                          >
                            <div className="flex items-center">
                              Phone
                              {getSortIcon('phone')}
                            </div>
                          </TableHead>
                          <TableHead>Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((c) => (
                          <TableRow 
                            key={c.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => openEdit(c)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedCustomers.has(c.id)}
                                onCheckedChange={(checked) => handleSelectCustomer(c.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.email ?? ''}</TableCell>
                            <TableCell>{c.phone ?? ''}</TableCell>
                            <TableCell>{c.address ?? ''}</TableCell>
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
                    <div className="text-lg font-medium">Add customers to get started</div>
                    <div className="text-sm text-muted-foreground">
                      Add them one by one or import your existing list.
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => openNew()}>
                        Add Customer
                      </Button>
                      <Button variant="outline" onClick={() => setCsvImportOpen(true)}>Import CSV</Button>
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
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{customerToDelete?.name}"? This action cannot be undone.
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="text-sm font-medium text-destructive">
                  ⚠️ This will also delete:
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  • All quotes created for this customer
                  <br />
                  • All invoices created for this customer
                  <br />
                  • All jobs scheduled for this customer
                  <br />
                  • All related line items and payments
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCustomer}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCustomer}
              disabled={isDeletingCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingCustomer ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Customers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCustomers.size} customer{selectedCustomers.size === 1 ? '' : 's'}? This action cannot be undone.
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="text-sm font-medium text-destructive">
                  ⚠️ This will also delete all related data:
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  • Quotes, invoices, jobs, and payments for these customers
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? 'Deleting...' : `Delete ${selectedCustomers.size} customer${selectedCustomers.size === 1 ? '' : 's'}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}