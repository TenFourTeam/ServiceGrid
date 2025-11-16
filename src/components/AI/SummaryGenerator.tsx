import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Copy, Loader2, FileText } from 'lucide-react';
import { useGenerateSummary, type SummaryRequest } from '@/hooks/useAIArtifacts';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface SummaryGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: string;
  defaultType?: 'team' | 'customer';
}

export function SummaryGenerator({ open, onOpenChange, jobId, defaultType = 'customer' }: SummaryGeneratorProps) {
  const [summaryType, setSummaryType] = useState<'team' | 'customer'>(defaultType);
  const [tonePreset, setTonePreset] = useState<'professional' | 'casual' | 'technical'>('professional');
  const [excludeInternalComments, setExcludeInternalComments] = useState(true);
  const [excludeCosts, setExcludeCosts] = useState(summaryType === 'customer');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  
  const generateMutation = useGenerateSummary();

  // Auto-update privacy defaults when type changes
  const handleTypeChange = (type: 'team' | 'customer') => {
    setSummaryType(type);
    if (type === 'customer') {
      setExcludeInternalComments(true);
      setExcludeCosts(true);
    } else {
      setExcludeInternalComments(false);
      setExcludeCosts(false);
    }
  };

  const handleGenerate = async () => {
    const request: SummaryRequest = {
      summaryType,
      tonePreset,
      redactionSettings: {
        excludeInternalComments,
        excludeCosts,
      },
      ...(jobId && { scope: { jobIds: [jobId] } }),
    };

    try {
      const result = await generateMutation.mutateAsync(request);
      setGeneratedContent(result.content_markdown);
      toast.success('Summary generated successfully!');
    } catch (error: any) {
      if (error.message?.includes('429')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('402')) {
        toast.error('Payment required. Please add credits to your workspace.');
      } else {
        toast.error('Failed to generate summary');
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Generate Summary
          </DialogTitle>
        </DialogHeader>

        {!generatedContent ? (
          <div className="space-y-6 py-4">
            {/* Summary Type */}
            <div className="space-y-3">
              <Label>Summary Type</Label>
              <RadioGroup value={summaryType} onValueChange={(v) => handleTypeChange(v as 'team' | 'customer')}>
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="flex-1 cursor-pointer">
                    <div className="font-medium">Team Summary</div>
                    <div className="text-sm text-muted-foreground">Internal view with full details and metrics</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="customer" id="customer" />
                  <Label htmlFor="customer" className="flex-1 cursor-pointer">
                    <div className="font-medium">Customer Summary</div>
                    <div className="text-sm text-muted-foreground">External view with privacy protections</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Tone Selection */}
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tonePreset} onValueChange={(v) => setTonePreset(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
              <Label className="text-base">Privacy & Content Settings</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="exclude-comments" className="text-sm font-normal">
                    Exclude Internal Comments
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Hide private team notes from the summary
                  </p>
                </div>
                <Switch
                  id="exclude-comments"
                  checked={excludeInternalComments}
                  onCheckedChange={setExcludeInternalComments}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="exclude-costs" className="text-sm font-normal">
                    Exclude Cost Information
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Remove pricing and cost details
                  </p>
                </div>
                <Switch
                  id="exclude-costs"
                  checked={excludeCosts}
                  onCheckedChange={setExcludeCosts}
                />
              </div>
            </div>

            {summaryType === 'customer' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  <strong>Customer Mode:</strong> This summary will automatically exclude sensitive information and use appropriate language for external sharing.
                </p>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button onClick={() => setGeneratedContent('')} variant="outline" size="sm" className="ml-auto">
                Generate New
              </Button>
            </div>
            <div className="prose prose-sm max-w-none border rounded-lg p-6 bg-background">
              <ReactMarkdown>{generatedContent}</ReactMarkdown>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
