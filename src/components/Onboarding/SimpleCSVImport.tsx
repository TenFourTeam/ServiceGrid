import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import Papa from 'papaparse';

interface CustomerImport {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface SimpleCSVImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (count: number) => void;
}

export function SimpleCSVImport({ open, onOpenChange, onImportComplete }: SimpleCSVImportProps) {
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const parseCSV = (file: File): Promise<CustomerImport[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          // Normalize header names to match our interface
          const normalized = header.toLowerCase().trim();
          if (normalized.includes('name')) return 'name';
          if (normalized.includes('email')) return 'email';
          if (normalized.includes('phone')) return 'phone';
          if (normalized.includes('address')) return 'address';
          return header;
        },
        complete: (results) => {
          try {
            const customers = results.data
              .map((row: any) => ({
                name: row.name?.trim() || '',
                email: row.email?.trim() || '',
                phone: row.phone?.trim() || undefined,
                address: row.address?.trim() || undefined,
              }))
              .filter((customer: CustomerImport) => 
                customer.name && customer.email && customer.email.includes('@')
              );
            
            resolve(customers);
          } catch (err) {
            reject(new Error('Failed to parse CSV data'));
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  };

  const handleImport = async () => {
    if (!file || !businessId) return;

    setImporting(true);
    try {
      // Parse CSV file
      const customers = await parseCSV(file);
      
      if (customers.length === 0) {
        toast.error('No valid customers found in CSV. Please check the format.');
        return;
      }

      const { data: result, error } = await authApi.invoke('bulk-import-customers', {
        method: 'POST',
        body: JSON.stringify({ customers }),
        headers: {
          'Content-Type': 'application/json'
        },
        toast: {
          success: false, // We'll show custom success message
          loading: `Importing ${customers.length} customers...`,
          error: 'Failed to import customers. Please check your file format.'
        }
      });

      if (error) {
        throw new Error(error.message || 'Import failed');
      }

      toast.success(`Successfully imported ${result.imported} customers`);
      
      invalidationHelpers.customers(queryClient, businessId);
      onImportComplete(result.imported);
      resetModal();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Customers from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground">
              CSV should include columns: Name, Email, Phone (optional), Address (optional)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Example: Name,Email,Phone,Address<br/>
              John Doe,john@example.com,555-1234,123 Main St
            </p>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="h-4 w-4" />
              <span className="text-sm">{file.name}</span>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="flex-1"
            >
              {importing ? 'Importing...' : 'Import Customers'}
            </Button>
            <Button variant="outline" onClick={resetModal}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}