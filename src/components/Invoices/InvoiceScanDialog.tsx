import { useState, useRef, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useInvoiceExtraction, type ExtractedInvoiceData } from '@/hooks/useInvoiceExtraction';
import { useConversationMediaUpload } from '@/hooks/useConversationMediaUpload';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadMedia, uploading } = useConversationMediaUpload();
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
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    try {
      // Upload image first
      const uploadResult = await uploadMedia(selectedFile, {
        conversationId: 'invoice-scan', // Temporary conversation for invoices
        onProgress: (progress) => console.log(`Upload: ${progress}%`)
      });

      // Extract data using AI
      const result = await extractMutation.mutateAsync(uploadResult.mediaId);
      
      setExtractedData(result.extracted);
      setConfidence(result.confidence);
      setWarnings(result.warnings || []);
      
      toast.success('Invoice data extracted successfully!');
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Failed to extract invoice data. Please try again.');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isLoading = uploading || extractMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) resetDialog();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan Receipt or Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Image Preview */}
          {!previewUrl ? (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <Button onClick={() => fileInputRef.current?.click()}>
                Take Photo or Select Image
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                For best results, ensure the receipt is well-lit and text is clear
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full rounded-lg border border-border max-h-96 object-contain"
              />

              {!extractedData && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleExtract}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      'Extract Data'
                    )}
                  </Button>
                  <Button
                    onClick={handleRetake}
                    variant="outline"
                    disabled={isLoading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Extracted Data */}
          {extractedData && confidence && (
            <div className="space-y-4">
              {/* Confidence Badge */}
              <div className="flex items-center gap-2">
                {confidence === 'high' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <Badge variant={confidence === 'high' ? 'default' : 'secondary'}>
                  {confidence.toUpperCase()} Confidence
                </Badge>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside text-sm">
                      {warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Data Preview */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  {extractedData.vendor && (
                    <div>
                      <span className="text-sm text-muted-foreground">Vendor:</span>
                      <p className="font-medium">{extractedData.vendor}</p>
                    </div>
                  )}
                  
                  {extractedData.date && (
                    <div>
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <p className="font-medium">{extractedData.date}</p>
                    </div>
                  )}

                  {extractedData.invoiceNumber && (
                    <div>
                      <span className="text-sm text-muted-foreground">Invoice #:</span>
                      <p className="font-medium">{extractedData.invoiceNumber}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-sm text-muted-foreground">Line Items:</span>
                    <div className="mt-2 space-y-2">
                      {extractedData.lineItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm border-b border-border pb-2">
                          <span>{item.description} ({item.quantity}x)</span>
                          <span className="font-medium">{formatMoney(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {extractedData.subtotal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatMoney(extractedData.subtotal)}</span>
                    </div>
                  )}

                  {extractedData.taxRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({(extractedData.taxRate * 100).toFixed(1)}%):</span>
                      <span>{formatMoney(extractedData.taxAmount || 0)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                    <span>Total:</span>
                    <span>{formatMoney(extractedData.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleUseData} className="flex-1">
                  Use This Data
                </Button>
                <Button onClick={handleRetake} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
