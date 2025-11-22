import { useState, useEffect, useRef } from 'react';
import { BeforeAfterPair } from '@/types/visualizations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  RefreshCw,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Columns2,
  Eye,
} from 'lucide-react';
import { downloadVisualization, shareVisualization } from '@/utils/visualization-helpers';
import { formatDistanceToNow } from 'date-fns';

interface BeforeAfterComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beforeAfterPair: BeforeAfterPair;
  onRegenerate: () => void;
}

type ComparisonMode = 'slider' | 'side-by-side' | 'overlay';

export function BeforeAfterComparison({
  open,
  onOpenChange,
  beforeAfterPair,
  onRegenerate,
}: BeforeAfterComparisonProps) {
  const { beforePhoto, variations, prompt, createdAt } = beforeAfterPair;
  
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('slider');
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedVariation = variations[selectedVariationIndex];

  // Handle slider drag
  const handleMouseDown = () => setIsDragging(true);
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };
  
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setSelectedVariationIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedVariationIndex(prev => Math.min(variations.length - 1, prev + 1));
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === ' ') {
        e.preventDefault();
        setComparisonMode(prev => 
          prev === 'slider' ? 'side-by-side' : prev === 'side-by-side' ? 'overlay' : 'slider'
        );
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open, variations.length, onOpenChange]);

  const handleDownload = () => {
    downloadVisualization(
      selectedVariation.public_url,
      `visualization_v${selectedVariation.generation_metadata.variation_number}.png`
    );
  };

  const handleShare = () => {
    shareVisualization(selectedVariation.public_url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isFullScreen ? 'max-w-screen max-h-screen w-screen h-screen' : 'sm:max-w-4xl'} p-0`}>
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Before & After Comparison
            </DialogTitle>
            <div className="flex items-center gap-2">
              {/* Comparison Mode Selector */}
              <Select value={comparisonMode} onValueChange={(v) => setComparisonMode(v as ComparisonMode)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slider">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4" />
                      Slider
                    </div>
                  </SelectItem>
                  <SelectItem value="side-by-side">
                    <div className="flex items-center gap-2">
                      <Columns2 className="w-4 h-4" />
                      Side-by-Side
                    </div>
                  </SelectItem>
                  <SelectItem value="overlay">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Overlay
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsFullScreen(!isFullScreen)}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Comparison View */}
          <div 
            ref={containerRef}
            className="relative w-full aspect-video overflow-hidden rounded-lg border bg-muted"
          >
            {comparisonMode === 'slider' && (
              <>
                {/* Before Image (full width) */}
                <img 
                  src={beforePhoto.public_url}
                  alt="Before"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* After Image (clipped by slider position) */}
                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <img 
                    src={selectedVariation.public_url}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Draggable Divider */}
                <div 
                  className="absolute inset-y-0 w-1 bg-white cursor-ew-resize z-10"
                  style={{ left: `${sliderPosition}%` }}
                  onMouseDown={handleMouseDown}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4" />
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                
                {/* Labels */}
                <Badge className="absolute top-4 left-4 bg-black/70 text-white">Before</Badge>
                <Badge className="absolute top-4 right-4 bg-primary/90 text-primary-foreground">AI Generated</Badge>
              </>
            )}

            {comparisonMode === 'side-by-side' && (
              <div className="grid grid-cols-2 gap-2 h-full p-2">
                <div className="relative rounded overflow-hidden">
                  <img 
                    src={beforePhoto.public_url}
                    alt="Before"
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-2 left-2 bg-black/70 text-white">Before</Badge>
                </div>
                <div className="relative rounded overflow-hidden">
                  <img 
                    src={selectedVariation.public_url}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-2 right-2 bg-primary/90 text-primary-foreground">AI Generated</Badge>
                </div>
              </div>
            )}

            {comparisonMode === 'overlay' && (
              <>
                <img 
                  src={showOverlay ? selectedVariation.public_url : beforePhoto.public_url}
                  alt={showOverlay ? "After" : "Before"}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                />
                <Badge className="absolute top-4 left-4 bg-black/70 text-white">
                  {showOverlay ? 'AI Generated' : 'Before'}
                </Badge>
                <Button
                  className="absolute bottom-4 left-1/2 -translate-x-1/2"
                  onMouseDown={() => setShowOverlay(true)}
                  onMouseUp={() => setShowOverlay(false)}
                  onMouseLeave={() => setShowOverlay(false)}
                >
                  Hold to Toggle
                </Button>
              </>
            )}
          </div>

          {/* Variation Selector */}
          {variations.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedVariationIndex(prev => Math.max(0, prev - 1))}
                disabled={selectedVariationIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm font-medium px-4">
                Variation {selectedVariationIndex + 1} of {variations.length}
              </span>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedVariationIndex(prev => Math.min(variations.length - 1, prev + 1))}
                disabled={selectedVariationIndex === variations.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Prompt:</span>
              <Badge variant="outline" className="capitalize">
                {selectedVariation.generation_metadata.style?.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{prompt}</p>
            <p className="text-xs text-muted-foreground">
              Generated {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
            <Button size="sm" onClick={onRegenerate}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
