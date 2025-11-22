import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Share2, Sparkles, RefreshCw, ImageIcon } from 'lucide-react';
import { useSOPInfographic } from '@/hooks/useSOPInfographic';
import { toast } from 'sonner';
import type { ServiceCatalogItem } from '@/hooks/useServiceCatalog';

interface SOPInfographicDialogProps {
  service: ServiceCatalogItem | null;
  open: boolean;
  onClose: () => void;
}

export function SOPInfographicDialog({ service, open, onClose }: SOPInfographicDialogProps) {
  const { generateInfographicAsync, isGenerating } = useSOPInfographic();
  const [localInfographicUrl, setLocalInfographicUrl] = useState<string | null>(null);

  if (!service) return null;

  const infographicUrl = localInfographicUrl || service.infographic_url;
  const hasInfographic = !!infographicUrl;

  const handleGenerate = async () => {
    try {
      const result = await generateInfographicAsync({
        serviceId: service.id,
        serviceName: service.service_name,
        description: service.description
      });
      
      if (result.infographicUrl) {
        setLocalInfographicUrl(result.infographicUrl);
      }
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to generate infographic:', error);
    }
  };

  const handleDownload = async () => {
    if (!infographicUrl) return;
    
    try {
      const response = await fetch(infographicUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${service.service_name.toLowerCase().replace(/\s+/g, '-')}-infographic.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Infographic downloaded');
    } catch (error) {
      toast.error('Failed to download infographic');
      console.error('Download error:', error);
    }
  };

  const handleShare = () => {
    if (!infographicUrl) return;
    
    navigator.clipboard.writeText(infographicUrl)
      .then(() => {
        toast.success('Link copied to clipboard!');
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
  };

  const handleClose = () => {
    setLocalInfographicUrl(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            SOP Process Infographic
          </DialogTitle>
          <DialogDescription>
            AI-generated visual process guide for {service.service_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{service.service_name}</h3>
                {service.category && (
                  <Badge variant="secondary" className="mt-1">
                    {service.category}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Unit Price</p>
                <p className="font-semibold">${service.unit_price.toFixed(2)}</p>
              </div>
            </div>
            
            {service.description && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-sm text-muted-foreground">Description:</p>
                <p className="text-sm mt-1">{service.description}</p>
              </div>
            )}
          </div>

          {/* Generation Section */}
          {!hasInfographic && !isGenerating && (
            <div className="bg-primary/5 rounded-lg p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Generate Process Infographic</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Create an AI-powered visual guide that breaks down this SOP into clear, actionable steps.
                  Perfect for training, field reference, and client presentations.
                </p>
              </div>
              <Button 
                onClick={handleGenerate}
                disabled={isGenerating}
                size="lg"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate Infographic
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="bg-muted/50 rounded-lg p-8 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div>
                <p className="font-semibold">Generating your infographic...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This may take 10-15 seconds. We're creating a professional visual guide for your SOP.
                </p>
              </div>
            </div>
          )}

          {/* Infographic Display */}
          {hasInfographic && !isGenerating && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-2">
                <img 
                  src={infographicUrl} 
                  alt={`${service.service_name} process infographic`}
                  className="w-full h-auto rounded-md"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Generated with Google Gemini 3 Pro Image • AI-powered process visualization
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
