import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { CustomerBottomModal } from '@/components/Customers/CustomerBottomModal';
import { useState, useEffect } from 'react';
import { useCustomersData } from '@/queries/unified';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { edgeToast } from "@/utils/edgeRequestWithToast";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { toast } from 'sonner';
import { SimpleCSVImport } from '@/components/Onboarding/SimpleCSVImport';
import { useLocation, useNavigate } from 'react-router-dom';
// Removed complex onboarding imports
import { cn } from '@/lib/utils';
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export default function CustomersPage() {
  const { isSignedIn, getToken } = useClerkAuth();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: customers, isLoading, error } = useCustomersData();
  
  // Use customer data directly from hook
  const rows = customers || [];

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', address: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  function openNew() {
    setEditingId(null);
    setDraft({ name: '', email: '', phone: '', address: '' });
    setOpen(true);
  }

  function openEdit(c: any) {
    setEditingId(c.id);
    setDraft({ name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '' });
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

  async function save() {
    if (!isSignedIn) {
      toast.error('You must be signed in to create customers.');
      return;
    }
    if (!draft.name.trim()) {
      toast.error('Please enter a customer name.');
      return;
    }
    if (!draft.email.trim()) {
      toast.error('Please enter a customer email.');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingId;

      const successMessage = isEdit ? 'Customer updated successfully' : 'Customer added successfully';
      await edgeToast.create(fn("customers"), {
        ...(isEdit ? { id: editingId } : {}),
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim() || null,
        address: draft.address.trim() || null,
      }, successMessage);
      
      setOpen(false);
      setEditingId(null);
      setDraft({ name: '', email: '', phone: '', address: '' });
      if (businessId) {
        invalidationHelpers.customers(queryClient, businessId);
      }
    } catch (e: any) {
      console.error('[CustomersPage] save customer failed:', e);
      toast.error(e?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(customer: any) {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  }

  async function deleteCustomer() {
    if (!customerToDelete) return;
    
    setDeleting(true);
    try {
      const response = await edgeRequest(fn("customers") + `?id=${customerToDelete.id}`, {
        method: 'DELETE'
      });
      
      // Show cascade deletion details if available
      if (response?.cascade_deleted) {
        const counts = response.cascade_deleted;
        const deletedItems = [];
        if (counts.quotes > 0) deletedItems.push(`${counts.quotes} quote${counts.quotes > 1 ? 's' : ''}`);
        if (counts.invoices > 0) deletedItems.push(`${counts.invoices} invoice${counts.invoices > 1 ? 's' : ''}`);
        if (counts.jobs > 0) deletedItems.push(`${counts.jobs} job${counts.jobs > 1 ? 's' : ''}`);
        
        if (deletedItems.length > 0) {
          toast.success(`Customer and ${deletedItems.join(', ')} deleted successfully`);
        } else {
          toast.success('Customer deleted successfully');
        }
      } else {
        toast.success('Customer deleted successfully');
      }
      
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      
      if (businessId) {
        invalidationHelpers.customers(queryClient, businessId);
      }
    } catch (e: any) {
      console.error('[CustomersPage] delete customer failed:', e);
      toast.error(e?.message || 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
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
            {isLoading ? (
              <div className="text-muted-foreground">Loading customers…</div>
            ) : error ? (
              <div className="text-destructive">Error loading customers: {error.message}</div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
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
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((c) => (
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
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
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
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteCustomer}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
