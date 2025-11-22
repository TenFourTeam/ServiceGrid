import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePropertyVisualization } from '@/hooks/usePropertyVisualization';
import { MediaItem } from '@/hooks/useJobMedia';
import { GenerationResult } from '@/types/visualizations';
import { toast } from 'sonner';

interface BeforeAfterVisualizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beforePhoto: MediaItem;
  jobId: string;
  jobType?: string;
  onVisualizationsGenerated?: (generationId: string) => void;
}

type VisualizationStyle = 'realistic' | 'architectural' | 'photo_realistic';

export function BeforeAfterVisualizationDialog({
  open,
  onOpenChange,
  beforePhoto,
  jobId,
  jobType,
  onVisualizationsGenerated
}: BeforeAfterVisualizationDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<VisualizationStyle>('realistic');
  const [numberOfVariations, setNumberOfVariations] = useState(1);
  const [generatedVariations, setGeneratedVariations] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<{ type: string; message: string } | null>(null);

  const { generateVisualization, isGenerating } = usePropertyVisualization();

  // Get job type specific placeholder
  const getPlaceholder = (jobType?: string): string => {
    const placeholders: Record<string, string> = {
      landscaping: "Describe the landscaping changes (e.g., 'Install new lawn, add garden beds with colorful flowers')",
      painting: "Describe the paint job (e.g., 'Paint exterior white with navy blue trim and black shutters')",
      roofing: "Describe the roofing work (e.g., 'Replace with charcoal gray architectural shingles')",
      hardscaping: "Describe the hardscaping work (e.g., 'Install stone patio with brick borders')",
    };
    return placeholders[jobType?.toLowerCase() || ''] || "Describe the completed work you want to visualize (e.g., colors, materials, changes)";
  };

  // Get job type context for AI prompt
  const getJobTypeContext = (jobType?: string): string => {
    const contexts: Record<string, string> = {
      landscaping: 'Focus on lawn quality, plant health, and outdoor aesthetics',
      painting: 'Ensure even coverage, clean lines, and professional finish',
      roofing: 'Show proper installation, clean edges, and matching materials',
      hardscaping: 'Display quality stonework, level surfaces, and proper drainage',
    };
    return contexts[jobType?.toLowerCase() || ''] || 'Focus on professional quality and completed work';
  };

  // Get style modifier for AI prompt
  const getStyleModifier = (style: VisualizationStyle): string => {
    const modifiers: Record<VisualizationStyle, string> = {
      realistic: 'Create a natural, photo-realistic result with authentic lighting',
      architectural: 'Generate a clean architectural visualization with enhanced clarity',
      photo_realistic: 'Produce an ultra-realistic image with fine details and textures',
    };
    return modifiers[style];
  };

  // Construct final AI prompt
  const constructFinalPrompt = (): string => {
    const context = getJobTypeContext(jobType);
    const styleModifier = getStyleModifier(style);

    return `${prompt}\n\nGuidelines: ${context}. ${styleModifier}. Maintain exact camera angle and lighting from the original photo.`;
  };

  // Handle generation
  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      toast.error('Please provide a detailed description (at least 10 characters)');
      return;
    }

    setError(null);

    try {
      const result = await generateVisualization.mutateAsync({
        beforeMediaId: beforePhoto.id,
        prompt: constructFinalPrompt(),
        jobId,
        style,
        numberOfVariations,
      });

      setGeneratedVariations(result);
      toast.success(`Generated ${result.variations.length} visualization(s)!`);
    } catch (err: any) {
      console.error('Visualization generation error:', err);
      if (err.errorType === 'RATE_LIMIT') {
        setError({ type: 'RATE_LIMIT', message: 'AI is experiencing high demand. Please try again in a moment.' });
      } else if (err.errorType === 'PAYMENT_REQUIRED') {
        setError({ type: 'PAYMENT_REQUIRED', message: 'AI credits exhausted. Please add credits to continue.' });
      } else {
        setError({ type: 'GENERIC', message: err.message || 'Failed to generate visualization. Please try again.' });
      }
    }
  };

  // Reset state on dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPrompt('');
      setStyle('realistic');
      setNumberOfVariations(1);
      setGeneratedVariations(null);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Property Visualization
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Safety check */}
          {!beforePhoto ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No photo selected. Please select a photo first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Before Photo Preview */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-4 items-center">
                    <img
                      src={beforePhoto.thumbnail_url || beforePhoto.public_url}
                      alt="Before photo"
                      className="w-24 h-24 rounded object-cover border"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Before Photo</p>
                      <p className="text-sm text-muted-foreground">{beforePhoto.original_filename}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Work Description *</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={getPlaceholder(jobType)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Be specific about colors, materials, and changes</span>
              <span>{prompt.length}/500</span>
            </div>
          </div>

          {/* Style Selector */}
          <div className="space-y-2">
            <Label htmlFor="style">Visualization Style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as VisualizationStyle)}>
              <SelectTrigger id="style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realistic">Realistic - Natural photo quality</SelectItem>
                <SelectItem value="architectural">Architectural - Clean presentation</SelectItem>
                <SelectItem value="photo_realistic">Photo-Realistic - Ultra detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Number of Variations */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="variations">Number of Variations</Label>
              <Badge variant="outline">
                {numberOfVariations} variation{numberOfVariations > 1 ? 's' : ''}
              </Badge>
            </div>
            <Slider
              id="variations"
              min={1}
              max={4}
              step={1}
              value={[numberOfVariations]}
              onValueChange={(v) => setNumberOfVariations(v[0])}
            />
            <p className="text-xs text-muted-foreground">
              Generate multiple options to compare different designs
            </p>
          </div>

          {/* AI Credits Cost */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Estimated Cost</span>
            </div>
            <Badge variant="secondary">{numberOfVariations * 10} AI credits</Badge>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.message}
                {error.type === 'RATE_LIMIT' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleGenerate}
                  >
                    Try Again
                  </Button>
                )}
                {error.type === 'PAYMENT_REQUIRED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open('/settings', '_blank')}
                  >
                    Add Credits
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Results Display */}
          {generatedVariations && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Generated Visualizations</h3>
                  <Badge variant="default" className="capitalize">
                    {generatedVariations.confidence} confidence
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {generatedVariations.variations.map((variation) => (
                    <div key={variation.mediaId} className="relative group">
                      <img
                        src={variation.publicUrl}
                        alt={`Variation ${variation.variationNumber}`}
                        className="w-full rounded-lg border aspect-video object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-background/90 text-foreground border">
                        {variation.variationNumber}/{generatedVariations.variations.length}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <DialogFooter>
          {!generatedVariations ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || prompt.length < 10}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Visualizations
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                onVisualizationsGenerated?.(generatedVariations.generationId);
                onOpenChange(false);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              View in Gallery
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
