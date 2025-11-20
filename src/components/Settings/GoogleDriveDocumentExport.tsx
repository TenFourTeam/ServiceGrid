import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useGoogleDriveSync } from '@/hooks/useGoogleDriveSync';
import { useGoogleDriveConnection } from '@/hooks/useGoogleDriveConnection';
import { Loader2, FileText, Download } from 'lucide-react';

export function GoogleDriveDocumentExport() {
  const { isConnected } = useGoogleDriveConnection();
  const { exportInvoice, exportQuote, isSyncing } = useGoogleDriveSync();

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Connect to Google Drive to export documents
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Export</CardTitle>
        <CardDescription>Export invoices and quotes as PDFs to Google Drive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-export-invoice">Auto-export Invoices</Label>
              <p className="text-sm text-muted-foreground">
                Automatically export invoices when created or updated
              </p>
            </div>
            <Switch id="auto-export-invoice" />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-export-quote">Auto-export Quotes</Label>
              <p className="text-sm text-muted-foreground">
                Automatically export quotes when created or updated
              </p>
            </div>
            <Switch id="auto-export-quote" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Invoices</h4>
              </div>
              <Badge variant="outline">PDF</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Export all invoices or selected ones
            </p>
            <Button
              size="sm"
              className="w-full"
              variant="outline"
              disabled={isSyncing}
            >
              {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Quotes</h4>
              </div>
              <Badge variant="outline">PDF</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Export all quotes or selected ones
            </p>
            <Button
              size="sm"
              className="w-full"
              variant="outline"
              disabled={isSyncing}
            >
              {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Documents will be organized in folders:</p>
          <code className="block mt-2 p-2 bg-muted rounded text-xs">
            ServiceGrid → Customer Name → invoices/ or quotes/
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
