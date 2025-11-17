import { useState, useRef, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useInvoiceExtraction, type ExtractedInvoiceData } from '@/hooks/useInvoiceExtraction';
import { useInvoiceMediaUpload } from '@/hooks/useInvoiceMediaUpload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoney } from '@/utils/format';
import { toast } from 'sonner';

interface InvoiceScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted: (data: ExtractedInvoiceData) => void;
}

export function InvoiceScanDialog({ open, onOpenChange, onDataExtracted }: InvoiceScanDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorType, setErrorType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const mediaUpload = useInvoiceMediaUpload();
  const extractMutation = useInvoiceExtraction();

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setExtractedData(null);
    setConfidence(null);
    setWarnings([]);
    setErrorType(null);
  };

  const handleExtract = async () => {
    if (!selectedFile) return;
    setErrorType(null);
    try {
      const uploadResult = await mediaUpload.uploadMedia(selectedFile);
      const result = await extractMutation.mutateAsync(uploadResult.mediaId);
      setExtractedData(result.extracted);
      setConfidence(result.confidence);
      setWarnings(result.warnings || []);
      toast.success('Invoice data extracted successfully!');
    } catch (error: any) {
      if (error.errorType === 'RATE_LIMIT') {
        setErrorType('RATE_LIMIT');
        toast.error('AI is busy. Please try again in a moment.');
      } else if (error.errorType === 'PAYMENT_REQUIRED') {
        setErrorType('PAYMENT_REQUIRED');
        toast.error('AI credits exhausted. Please add credits to continue.');
      } else {
        toast.error('Failed to extract invoice data. Please try again.');
      }
    }
  };

  const handleUseData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      onOpenChange(false);
      resetDialog();
    }
  };

  const handleRetake = () => {
    resetDialog();
    fileInputRef.current?.click();
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setConfidence(null);
    setWarnings([]);
    setErrorType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLoading = mediaUpload.uploading || extractMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => { onOpenChange(newOpen); if (!newOpen) resetDialog(); }}>
      <DialogContent className="max-w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan Receipt or Invoice</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">For best results, ensure the receipt is well-lit and text is clearly visible</p>
        </DialogHeader>
        <div className="space-y-4">
          {errorType === 'RATE_LIMIT' && (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>AI is experiencing high demand. Please wait a moment and try again.</AlertDescription></Alert>
          )}
          {errorType === 'PAYMENT_REQUIRED' && (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="flex items-center justify-between"><span>AI credits exhausted.</span><Button size="sm" variant="outline" onClick={() => window.open('https://lovable.dev/settings/usage', '_blank')}>Add Credits</Button></AlertDescription></Alert>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          {!selectedFile ? (
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
              <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="font-medium mb-2">Scan a Receipt or Invoice</h3>
              <p className="text-sm text-muted-foreground mb-3">Click to take a photo or select an image</p>
              <ul className="text-sm text-muted-foreground space-y-1"><li>• Ensure text is clear and readable</li><li>• Include all line items</li><li>• Capture total and tax amounts</li></ul>
            </div>
          ) : (
            <div className="space-y-4">
              {previewUrl && <div className="relative rounded-lg overflow-hidden border"><img src={previewUrl} alt="Receipt preview" className="w-full h-auto max-h-96 object-contain bg-muted" /></div>}
              <div className="flex gap-2">
                <Button onClick={handleExtract} disabled={isLoading} className="flex-1">{extractMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing receipt...</> : 'Extract Data'}</Button>
                <Button variant="outline" onClick={handleRetake} disabled={isLoading}><RefreshCw className="w-4 h-4 mr-2" />Retake</Button>
              </div>
            </div>
          )}
          {extractedData && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Extracted Data</h3>
                {confidence && <Badge variant={confidence === 'high' ? 'default' : confidence === 'medium' ? 'secondary' : 'destructive'}>{confidence === 'high' && <CheckCircle2 className="w-3 h-3 mr-1" />}{confidence !== 'high' && <AlertCircle className="w-3 h-3 mr-1" />}{confidence.toUpperCase()} CONFIDENCE</Badge>}
              </div>
              {warnings.length > 0 && <Alert><AlertCircle className="h-4 w-4" /><AlertDescription><p className="font-medium mb-1">Please review carefully:</p><ul className="list-disc pl-4 space-y-1 text-sm">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></AlertDescription></Alert>}
              <Card><CardContent className="pt-6 space-y-3">
                {extractedData.vendor && <div><span className="text-sm text-muted-foreground">Vendor:</span><p className="font-medium">{extractedData.vendor}</p></div>}
                {extractedData.date && <div><span className="text-sm text-muted-foreground">Date:</span><p className="font-medium">{extractedData.date}</p></div>}
                {extractedData.invoiceNumber && <div><span className="text-sm text-muted-foreground">Invoice #:</span><p className="font-medium">{extractedData.invoiceNumber}</p></div>}
                {extractedData.lineItems.length > 0 && <div className="border-t pt-3"><span className="text-sm text-muted-foreground mb-2 block">Line Items:</span><div className="space-y-2">{extractedData.lineItems.map((item, i) => <div key={i} className="flex justify-between text-sm"><span>{item.description} (x{item.quantity})</span><span className="font-medium">{formatMoney(item.total)}</span></div>)}</div></div>}
                <div className="border-t pt-3 space-y-2">
                  {extractedData.subtotal !== undefined && <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{formatMoney(extractedData.subtotal)}</span></div>}
                  {extractedData.taxAmount !== undefined && <div className="flex justify-between text-sm"><span>Tax ({extractedData.taxRate ? `${extractedData.taxRate}%` : ''}):</span><span>{formatMoney(extractedData.taxAmount)}</span></div>}
                  <div className="flex justify-between font-medium"><span>Total:</span><span>{formatMoney(extractedData.total)}</span></div>
                </div>
              </CardContent></Card>
              <Button onClick={handleUseData} className="w-full" size="lg">Use This Data</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
