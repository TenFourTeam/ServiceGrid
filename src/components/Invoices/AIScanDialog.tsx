import { useState, useRef, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, AlertCircle, CheckCircle2, RefreshCw, FileText, Image, Sparkles, ListChecks } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInvoiceExtraction, type ExtractedInvoiceData } from '@/hooks/useInvoiceExtraction';
import { useInvoiceMediaUpload } from '@/hooks/useInvoiceMediaUpload';
import { useJobEstimation, type JobEstimate } from '@/hooks/useJobEstimation';
import { useChecklistGeneration, type GeneratedChecklist } from '@/hooks/useChecklistGeneration';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoney } from '@/utils/format';
import { toast } from 'sonner';

type ScanMode = 'receipt' | 'photo' | 'checklist';

interface AIScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted?: (data: ExtractedInvoiceData) => void;
  onEstimateExtracted?: (estimate: JobEstimate) => void;
  onChecklistGenerated?: (checklist: GeneratedChecklist) => void;
  jobId?: string;
  mode?: ScanMode;
}

export function AIScanDialog({ 
  open, 
  onOpenChange, 
  onDataExtracted,
  onEstimateExtracted,
  onChecklistGenerated,
  jobId,
  mode: initialMode = 'receipt'
}: AIScanDialogProps) {
  const [scanMode, setScanMode] = useState<ScanMode>(initialMode);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [estimate, setEstimate] = useState<JobEstimate | null>(null);
  const [checklist, setChecklist] = useState<GeneratedChecklist | null>(null);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorType, setErrorType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const mediaUpload = useInvoiceMediaUpload();
  const extractMutation = useInvoiceExtraction();
  const estimateMutation = useJobEstimation();
  const checklistMutation = useChecklistGeneration();

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
    setChecklist(null);
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
      } else if (scanMode === 'photo') {
        const result = await estimateMutation.mutateAsync({ 
          mediaId: uploadResult.mediaId,
          jobId 
        });
        setEstimate(result);
        setConfidence(result.confidence);
        toast.success('Estimate generated!');
      } else if (scanMode === 'checklist') {
        const result = await checklistMutation.mutateAsync({ 
          mediaId: uploadResult.mediaId,
          jobId 
        });
        setChecklist(result);
        setConfidence(result.confidence);
        toast.success('Checklist generated!');
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
    if (extractedData && onDataExtracted) {
      onDataExtracted(extractedData);
    } else if (estimate && onEstimateExtracted) {
      onEstimateExtracted(estimate);
    } else if (checklist && onChecklistGenerated) {
      onChecklistGenerated(checklist);
    }
    onOpenChange(false);
  };

  const handleRetake = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setEstimate(null);
    setChecklist(null);
    setConfidence(null);
    setWarnings([]);
    setErrorType(null);
  };

  const resetDialog = () => {
    handleRetake();
    setScanMode(initialMode);
  };

  const isLoading = mediaUpload.uploading || extractMutation.isPending || estimateMutation.isPending || checklistMutation.isPending;
  const hasResult = extractedData !== null || estimate !== null || checklist !== null;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Document Scanner
          </DialogTitle>
        </DialogHeader>

        <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as ScanMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="receipt" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Receipt
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Estimate
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Checklist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receipt" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Upload a receipt or invoice photo. AI will extract vendor, date, amount, and line items.
            </p>
          </TabsContent>

          <TabsContent value="photo" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Upload a photo of completed work. AI will generate an estimate based on your service catalog.
            </p>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Upload a photo of the work site. AI will generate a detailed task checklist (SOP) for the job.
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 mt-2">
          {!selectedFile && (
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Click to select an image or PDF
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {selectedFile && previewUrl && !hasResult && (
            <div className="space-y-4">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full rounded-lg border"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleExtract}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {scanMode === 'receipt' ? 'Extract Data' : scanMode === 'photo' ? 'Generate Estimate' : 'Generate Checklist'}
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRetake}
                  variant="outline"
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {selectedFile && !previewUrl && !hasResult && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-center text-muted-foreground">
                    PDF selected: {selectedFile.name}
                  </p>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button
                  onClick={handleExtract}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Extract Data
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRetake}
                  variant="outline"
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {errorType && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorType === 'RATE_LIMIT' && 'AI is experiencing high demand. Please try again in a moment.'}
                {errorType === 'PAYMENT_REQUIRED' && 'AI credits exhausted. Please add credits to your workspace.'}
              </AlertDescription>
            </Alert>
          )}

          {extractedData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Extracted Data</h3>
                {confidence && (
                  <Badge variant={confidence === 'high' ? 'default' : confidence === 'medium' ? 'secondary' : 'destructive'}>
                    {confidence} confidence
                  </Badge>
                )}
              </div>
              
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Vendor:</span>
                    <span className="text-sm font-medium">{extractedData.vendor || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date:</span>
                    <span className="text-sm font-medium">{extractedData.date || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <span className="text-sm font-medium">{extractedData.total ? formatMoney(extractedData.total) : 'N/A'}</span>
                  </div>
                  {extractedData.lineItems && extractedData.lineItems.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Line Items:</p>
                      {extractedData.lineItems.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{item.description}</span>
                          <span>{formatMoney(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc pl-4 space-y-1">
                      {warnings.map((w, i) => (
                        <li key={i} className="text-sm">{w}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={handleUseData} className="flex-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Use This Data
                </Button>
                <Button onClick={handleRetake} variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {estimate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Generated Estimate</h3>
                {confidence && (
                  <Badge variant={confidence === 'high' ? 'default' : confidence === 'medium' ? 'secondary' : 'destructive'}>
                    {confidence} confidence
                  </Badge>
                )}
              </div>
              
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Work Description:</p>
                    <p className="text-sm text-muted-foreground">{estimate.workDescription}</p>
                  </div>
                  
                  {estimate.lineItems && estimate.lineItems.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">Services:</p>
                      <div className="space-y-2">
                        {estimate.lineItems.map((item, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{item.name}</span>
                              <span>{formatMoney(item.unit_price * item.quantity)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit} × {formatMoney(item.unit_price)}
                              {item.notes && ` - ${item.notes}`}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t mt-2">
                        <span>Total:</span>
                        <span>{formatMoney(estimate.lineItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0))}</span>
                      </div>
                    </div>
                  )}

                  {estimate.additionalNotes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm text-muted-foreground">{estimate.additionalNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button onClick={handleUseData} className="flex-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Use This Estimate
                </Button>
                <Button onClick={handleRetake} variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {checklist && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{checklist.checklist_title}</h3>
                {confidence && (
                  <Badge variant={confidence === 'high' ? 'default' : confidence === 'medium' ? 'secondary' : 'destructive'}>
                    {confidence} confidence
                  </Badge>
                )}
              </div>
              
              <Card>
                <CardContent className="p-4 space-y-3">
                  {checklist.notes && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {checklist.notes}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Tasks ({checklist.tasks.length}):</p>
                    
                    {checklist.tasks.map((task, i) => (
                      <div key={i} className="flex gap-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{task.title}</p>
                            {task.category && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {task.category}
                              </Badge>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground">{task.description}</p>
                          )}
                          <div className="flex gap-3 text-xs text-muted-foreground pt-1">
                            {task.estimated_duration_minutes && (
                              <span>⏱️ {task.estimated_duration_minutes} min</span>
                            )}
                            {task.required_photo_count > 0 && (
                              <span>📷 {task.required_photo_count} {task.required_photo_count === 1 ? 'photo' : 'photos'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t text-sm text-muted-foreground">
                    Total estimated time: {checklist.tasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0)} minutes
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button onClick={handleUseData} className="flex-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Create Checklist
                </Button>
                <Button onClick={handleRetake} variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
