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

  const transformHeader = (header: string): string => {
    return header
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const synthesizeName = (row: any): string => {
    // Try full_name or name first
    if (row.full_name || row.name) {
      return row.full_name || row.name;
    }
    
    // Try first_name + last_name combinations
    const firstName = row.first_name || row.firstname || '';
    const lastName = row.last_name || row.lastname || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    // Return whatever we have
    return firstName || lastName || '';
  };

  const synthesizeAddress = (row: any): string => {
    // Try direct address field first
    if (row.address) {
      return row.address;
    }
    
    // Build address from components
    const parts: string[] = [];
    
    // Street address (could be address1 + address2 or just street)
    const street1 = row.street || row.address1 || row.street_address || '';
    const street2 = row.address2 || '';
    
    if (street1) parts.push(street1);
    if (street2) parts.push(street2);
    
    // City
    const city = row.city || '';
    if (city) parts.push(city);
    
    // State and ZIP (combine these on same line)
    const state = row.state || row.province || '';
    const zip = row.zip || row.postal_code || row.zipcode || row.postcode || '';
    
    if (state && zip) {
      parts.push(`${state} ${zip}`);
    } else if (state) {
      parts.push(state);
    } else if (zip) {
      parts.push(zip);
    }
    
    return parts.join(', ');
  };

  const parseCSV = (file: File): Promise<CustomerImport[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader,
        complete: (results) => {
          try {
            const customers = results.data
              .map((row: any) => ({
                name: synthesizeName(row)?.trim() || '',
                email: row.email?.trim() || '',
                phone: row.phone?.trim() || undefined,
                address: synthesizeAddress(row)?.trim() || undefined,
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
        toast.error('No valid customers found in CSV. Please check the format and ensure email addresses are valid.');
        return;
      }

      console.log("Parsed customers for import:", customers);

      const { data: result, error } = await authApi.invoke('bulk-import-customers', {
        method: 'POST',
        body: JSON.stringify({ customers }),
        headers: {
          'Content-Type': 'application/json'
        },
        toast: {
          success: false, // We'll show custom success message
          loading: `Importing ${customers.length} customers...`,
          error: false // We'll handle errors manually
        }
      });

      if (error) {
        console.error("Import API error:", error);
        
        // More specific error handling
        if (error.message?.includes('JWT') || error.message?.includes('Unauthorized') || error.status === 401) {
          toast.error("Authentication error. Please refresh the page and try again.");
        } else if (error.status === 403) {
          toast.error("Permission denied. Please contact support.");
        } else if (error.status === 500) {
          toast.error("Server error. Please try again in a few minutes.");
        } else {
          toast.error(`Import failed: ${error.message || 'Unknown error occurred'}`);
        }
        return;
      }

      if (result?.imported > 0) {
        toast.success(`Successfully imported ${result.imported} customers`);
        invalidationHelpers.customers(queryClient, businessId);
        onImportComplete(result.imported);
        resetModal();
      } else {
        toast.warning(result?.message || "No new customers were imported (duplicates or invalid data)");
      }
    } catch (error) {
      console.error('Import error:', error);
      
      // Handle network and other errors
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          toast.error("Network error. Please check your connection and try again.");
        } else if (error.message.includes('CSV parsing')) {
          toast.error("Invalid CSV format. Please check your file and try again.");
        } else {
          toast.error(`Import failed: ${error.message}`);
        }
      } else {
        toast.error('An unexpected error occurred during import');
      }
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
              CSV should include: Email (required), Name fields, Phone (optional), Address fields (optional)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Name fields:</strong> Name, Full_Name, or First_Name + Last_Name<br/>
              <strong>Address fields:</strong> Address, or Street + City + State + ZIP<br/>
              <strong>Example:</strong> First_Name,Last_Name,Email,Phone,Street,City,State,ZIP
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