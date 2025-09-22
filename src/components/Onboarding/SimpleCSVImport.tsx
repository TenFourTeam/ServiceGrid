import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import Papa from 'papaparse';
import { hasMessage, hasStatus, hasImported } from '@/types/api';

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
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId, canManage } = useBusinessContext();
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

  const synthesizePhone = (row: any): string => {
    // Look for various phone field names
    const phoneFields = ['phone', 'mobile', 'cell', 'telephone', 'phone_number', 'mobile_number', 'cell_phone'];
    for (const field of phoneFields) {
      if (row[field]?.trim()) {
        return row[field].trim();
      }
    }
    return '';
  };

  const synthesizeAddress = (row: any): string => {
    // Try single address field first
    const singleAddressFields = ['address', 'street_address', 'location', 'full_address'];
    for (const field of singleAddressFields) {
      if (row[field]?.trim()) {
        return row[field].trim();
      }
    }
    
    // Try to combine multiple address components
    const street = row.street || row.street_address || row.address_line_1 || '';
    const city = row.city || '';
    const state = row.state || row.province || '';
    const zip = row.zip || row.postal_code || row.zipcode || '';
    
    const components = [street, city, state, zip].filter(c => c?.trim());
    if (components.length > 0) {
      return components.join(', ');
    }
    
    return '';
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
              .map((row: any) => {
                const phone = synthesizePhone(row);
                const address = synthesizeAddress(row);
                
                return {
                  name: synthesizeName(row)?.trim() || '',
                  email: row.email?.trim() || '',
                  ...(phone && { phone }),
                  ...(address && { address })
                };
              })
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
        body: { customers },
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

  // Show permission denied message for non-owners
  if (!canManage) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Customers from CSV
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 p-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Only business owners can import customers from CSV files.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Contact your business owner for help with importing customers.
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Customers from CSV
          </DrawerTitle>
        </DrawerHeader>

        <div className="space-y-4 p-4">
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
              CSV should include: Name and Email (both required). Phone and Address are optional.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Required:</strong> Email<br/>
              <strong>Name fields:</strong> Name, Full_Name, or First_Name + Last_Name<br/>
              <strong>Phone fields:</strong> Phone, Mobile, Cell, Telephone<br/>
              <strong>Address fields:</strong> Address, Street_Address, or Street + City + State + Zip<br/>
              <strong>Example:</strong> First_Name,Last_Name,Email,Phone,Address
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
      </DrawerContent>
    </Drawer>
  );
}