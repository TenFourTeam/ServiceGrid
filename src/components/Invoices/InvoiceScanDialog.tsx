import { useState, useRef, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, AlertCircle, CheckCircle2, RefreshCw, FileText, Image, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInvoiceExtraction, type ExtractedInvoiceData } from '@/hooks/useInvoiceExtraction';
import { useInvoiceMediaUpload } from '@/hooks/useInvoiceMediaUpload';
import { useJobEstimation, type JobEstimate } from '@/hooks/useJobEstimation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoney } from '@/utils/format';
import { toast } from 'sonner';

type ScanMode = 'receipt' | 'photo';

interface InvoiceScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted: (data: ExtractedInvoiceData) => void;
  onEstimateExtracted?: (estimate: JobEstimate) => void;
  jobId?: string;
  mode?: ScanMode;
}

export function InvoiceScanDialog({ 
  open, 
  onOpenChange, 
  onDataExtracted,
  onEstimateExtracted,
  jobId,
  mode: initialMode = 'receipt'
}: InvoiceScanDialogProps) {
  const [scanMode, setScanMode] = useState<ScanMode>(initialMode);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [estimate, setEstimate] = useState<JobEstimate | null>(null);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorType, setErrorType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const mediaUpload = useInvoiceMediaUpload();
  const extractMutation = useInvoiceExtraction();
  const estimateMutation = useJobEstimation();

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    
    if (!isImage && !isPDF) {
      toast.error('Please select an image or PDF file');
      return;
    }
    
    setSelectedFile(file);
    if (isImage) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
    setExtractedData(null);
    setEstimate(null);
    setConfidence(null);
    setWarnings([]);
    setErrorType(null);
  };

  const handleExtract = async () => {
    if (!selectedFile) return;
    setErrorType(null);
    try {
      const uploadResult = await mediaUpload.uploadMedia(selectedFile);
      
      if (scanMode === 'receipt') {
        const result = await extractMutation.mutateAsync(uploadResult.mediaId);
        setExtractedData(result.extracted);
        setConfidence(result.confidence);
        setWarnings(result.warnings || []);
        toast.success('Invoice data extracted!');
      } else {
        const result = await estimateMutation.mutateAsync({ 
          mediaId: uploadResult.mediaId,
          jobId 
        });
        setEstimate(result);
        setConfidence(result.confidence);
        toast.success('Estimate generated!');
      }
    } catch (error: any) {
      if (error.errorType === 'RATE_LIMIT') {
        setErrorType('RATE_LIMIT');
        toast.error('AI is busy. Try again in a moment.');
      } else if (error.errorType === 'PAYMENT_REQUIRED') {
        setErrorType('PAYMENT_REQUIRED');
        toast.error('AI credits exhausted.');
      } else {
        toast.error(error.message || 'Failed to process file.');
      }
    }
  };

  const handleUseData = () => {
    if (scanMode === 'receipt' && extractedData) {
      onDataExtracted(extractedData);
    } else if (scanMode === 'photo' && estimate && onEstimateExtracted) {
      onEstimateExtracted(estimate);
    }
    onOpenChange(false);
    resetDialog();
  };

  const handleRetake = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setEstimate(null);
    setConfidence(null);
    setWarnings([]);
    setErrorType(null);
    fileInputRef.current?.click();
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setEstimate(null);
    setConfidence(null);
    setWarnings([]);
    setErrorType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLoading = mediaUpload.uploading || extractMutation.isPending || estimateMutation.isPending;
  const acceptTypes = scanMode === 'receipt' ? 'image/*,application/pdf' : 'image/*';

  return (
    <Dialog open={open} onOpenChange={(newOpen) => { onOpenChange(newOpen); if (!newOpen) resetDialog(); }}>
      <DialogContent className="max-w-full md:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Invoice Assistant
          </DialogTitle>
        </DialogHeader>

        <Tabs value={scanMode} onValueChange={(v) => { setScanMode(v as ScanMode); resetDialog(); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receipt"><FileText className="h-4 w-4 mr-2" />Scan Receipt</TabsTrigger>
            <TabsTrigger value="photo"><Image className="h-4 w-4 mr-2" />Estimate from Photo</TabsTrigger>
          </TabsList>

          <TabsContent value="receipt" className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload vendor receipt/invoice (images or PDFs)</p>
            <input ref={fileInputRef} type="file" accept={acceptTypes} onChange={handleFileSelect} className="hidden" />
            {!selectedFile ? (
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="font-medium mb-2">Upload Receipt</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {previewUrl && <img src={previewUrl} alt="Preview" className="w-full max-h-96 object-contain border rounded" />}
                <Button onClick={handleExtract} disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Extract Data
                </Button>
              </div>
            )}
            {extractedData && <Button onClick={handleUseData} className="w-full">Use Data</Button>}
          </TabsContent>

          <TabsContent value="photo" className="space-y-4">
            <p className="text-sm text-muted-foreground">Photo of completed work for AI estimation</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            {!selectedFile ? (
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="font-medium mb-2">Take Photo</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {previewUrl && <img src={previewUrl} alt="Job" className="w-full max-h-96 object-contain border rounded" />}
                <Button onClick={handleExtract} disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Generate Estimate
                </Button>
              </div>
            )}
            {estimate && <Button onClick={handleUseData} className="w-full">Use Estimate</Button>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
