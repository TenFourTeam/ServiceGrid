import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { CustomerBottomModal } from '@/components/Customers/CustomerBottomModal';
import { CustomerSearchFilter } from '@/components/Customers/CustomerSearchFilter';
import { useState, useMemo, useEffect, useRef } from "react";
import { useCustomersData } from '@/queries/unified';
import { SimpleCSVImport } from '@/components/Onboarding/SimpleCSVImport';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomerOperations } from '@/hooks/useCustomerOperations';
import CustomerErrorBoundary from '@/components/ErrorBoundaries/CustomerErrorBoundary';

export default function CustomersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: customers, isLoading, error } = useCustomersData();
  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  
  const { deleteCustomer, isDeletingCustomer } = useCustomerOperations();
  
  // Track deletion state to close dialog when complete
  const wasDeletingRef = useRef(false);
  
  useEffect(() => {
    if (wasDeletingRef.current && !isDeletingCustomer) {
      // Deletion just finished, close dialog
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
    wasDeletingRef.current = isDeletingCustomer;
  }, [isDeletingCustomer]);
  
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

  function handleDeleteCustomer() {
    if (!customerToDelete) return;
    
    console.info('[CustomersPage] Starting customer deletion:', customerToDelete.id);
    deleteCustomer(customerToDelete.id);
    // Dialog will close automatically when deletion completes
  }

  return (
    <AppLayout title="Customers">
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Customers</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCsvImportOpen(true)}>
                  Import CSV
                </Button>
                <Button onClick={() => openNew()}>
                  New Customer
                </Button>
              </div>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((c) => (
                        <TableRow 
                          key={c.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => openEdit(c)}
                        >
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.email ?? ''}</TableCell>
                          <TableCell>{c.phone ?? ''}</TableCell>
                          <TableCell>{c.address ?? ''}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteDialog(c);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                  disabled={isDeletingCustomer}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
    </AppLayout>
  );
}