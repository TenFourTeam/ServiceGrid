import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { edgeFetchJson } from '@/utils/edgeApi';

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (count: number) => void;
}

interface ParsedRow {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface ColumnMapping {
  name?: number;
  email?: number;
  phone?: number;
  address?: number;
}

export function CSVImportModal({ open, onOpenChange, onImportComplete }: CSVImportModalProps) {
  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');

  const parseCSV = useCallback((text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    });
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setCsvData(parsed);
      setStep('mapping');
    };
    reader.readAsText(uploadedFile);
  }, [parseCSV]);

  const handleMapping = useCallback(() => {
    if (!csvData.length) return;

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    
    const mapped: ParsedRow[] = csvData.slice(1).map(row => ({
      name: columnMapping.name !== undefined ? (row[columnMapping.name] || '') : '',
      email: columnMapping.email !== undefined ? (row[columnMapping.email] || '') : '',
      phone: columnMapping.phone !== undefined ? (row[columnMapping.phone] || '') : '',
      address: columnMapping.address !== undefined ? (row[columnMapping.address] || '') : '',
    })).filter(row => {
      // Require both name and valid email
      const hasName = row.name.trim();
      const hasValidEmail = row.email.trim() && emailRegex.test(row.email.trim());
      return hasName && hasValidEmail;
    });

    setPreviewData(mapped);
    setStep('preview');
  }, [csvData, columnMapping]);

  const handleImport = useCallback(async () => {
    if (!previewData.length) return;

    setImporting(true);
    try {
      const data = await edgeFetchJson('bulk-import-customers', getToken, {
        method: 'POST',
        body: { customers: previewData },
      });

      const imported = data.imported || previewData.length;
      queryClient.invalidateQueries({ queryKey: ['supabase', 'customers'] });
      toast.success(`Successfully imported ${imported} customers`);
      onImportComplete(imported);
      onOpenChange(false);
      resetModal();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import customers. Please try again.');
    } finally {
      setImporting(false);
    }
  }, [previewData, getToken, queryClient, onImportComplete, onOpenChange]);

  const resetModal = useCallback(() => {
    setFile(null);
    setCsvData([]);
    setColumnMapping({});
    setPreviewData([]);
    setStep('upload');
  }, []);

  const handleClose = useCallback((open: boolean) => {
    if (!open) resetModal();
    onOpenChange(open);
  }, [onOpenChange, resetModal]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="space-y-2">
                <h3 className="font-medium">Upload your CSV file</h3>
                <p className="text-sm text-muted-foreground">
                  Include columns for Name, Email, Phone, and Address
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                 <div className="text-sm">
                   <p className="font-medium mb-1">CSV Format Requirements:</p>
                   <ul className="text-muted-foreground space-y-1">
                     <li>• First row should contain column headers</li>
                     <li>• Required: Name and Email columns</li>
                     <li>• Optional: Phone, Address columns</li>
                     <li>• Use commas to separate values</li>
                     <li>• All emails must be valid format</li>
                   </ul>
                 </div>
              </div>
            </div>
          </div>
        )}

        {step === 'mapping' && csvData.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Map CSV Columns</h3>
            <p className="text-sm text-muted-foreground">
              Match your CSV columns to customer fields:
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name Column *</Label>
                <Select onValueChange={(value) => setColumnMapping(prev => ({ ...prev, name: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvData[0]?.map((header, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Column {index + 1}: {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

               <div className="space-y-2">
                 <Label>Email Column *</Label>
                 <Select onValueChange={(value) => setColumnMapping(prev => ({ ...prev, email: parseInt(value) }))}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select column" />
                   </SelectTrigger>
                   <SelectContent>
                     {csvData[0]?.map((header, index) => (
                       <SelectItem key={index} value={index.toString()}>
                         Column {index + 1}: {header}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

              <div className="space-y-2">
                <Label>Phone Column</Label>
                <Select onValueChange={(value) => setColumnMapping(prev => ({ ...prev, phone: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">None</SelectItem>
                    {csvData[0]?.map((header, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Column {index + 1}: {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Address Column</Label>
                <Select onValueChange={(value) => setColumnMapping(prev => ({ ...prev, address: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">None</SelectItem>
                    {csvData[0]?.map((header, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Column {index + 1}: {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
               <Button 
                 onClick={handleMapping}
                 disabled={columnMapping.name === undefined || columnMapping.email === undefined}
               >
                 Preview Import
               </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Preview Import</h3>
              <p className="text-sm text-muted-foreground">
                {previewData.length} customers will be imported
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.email || '—'}</TableCell>
                      <TableCell>{row.phone || '—'}</TableCell>
                      <TableCell>{row.address || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {previewData.length > 10 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing first 10 of {previewData.length} customers
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : `Import ${previewData.length} Customers`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}