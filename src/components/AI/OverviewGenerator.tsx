import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Sparkles, Calendar as CalendarIcon, Download, Copy, Loader2 } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { useGenerateOverview, type OverviewScope } from '@/hooks/useAIArtifacts';
import { useBusinessMembersData } from '@/hooks/useBusinessMembers';
import { useJobsData } from '@/hooks/useJobsData';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface OverviewGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDateRange?: { start: Date; end: Date };
}

export function OverviewGenerator({ open, onOpenChange, defaultDateRange }: OverviewGeneratorProps) {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | undefined>(defaultDateRange);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  const { data: members } = useBusinessMembersData();
  const { data: jobsData } = useJobsData();
  const generateMutation = useGenerateOverview();
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  // Fetch unique tags from media
  useEffect(() => {
    if (!businessId) return;
    
    authApi.invoke(`job-media-crud?businessId=${businessId}`, { method: 'GET' })
      .then(({ data }) => {
        if (data?.media) {
          const tags = new Set<string>();
          data.media.forEach((item: any) => {
            if (item.tags) {
              item.tags.forEach((tag: string) => tags.add(tag));
            }
          });
          setAvailableTags(Array.from(tags).sort());
        }
      })
      .catch(console.error);
  }, [businessId, authApi]);

  const jobs = useMemo(() => jobsData?.data || [], [jobsData]);

  const datePresets = [
    { label: 'Last 7 Days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
    { label: 'Last 30 Days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
    { label: 'This Week', getValue: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }) },
  ];

  const estimatedJobCount = useMemo(() => {
    if (!dateRange) return 0;
    return jobs.filter(job => {
      const jobDate = job.starts_at ? new Date(job.starts_at) : null;
      if (!jobDate) return false;
      const inRange = jobDate >= dateRange.start && jobDate <= dateRange.end;
      const matchesAssignee = selectedAssignees.length === 0 || 
        job.assignments?.some(a => selectedAssignees.includes(a.user_id));
      return inRange && matchesAssignee;
    }).length;
  }, [jobs, dateRange, selectedAssignees]);

  const handleGenerate = async () => {
    if (!dateRange) {
      toast.error('Please select a date range');
      return;
    }

    const scope: OverviewScope = {
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      ...(selectedAssignees.length > 0 && { assignees: selectedAssignees }),
      ...(selectedJobIds.length > 0 && { jobIds: selectedJobIds }),
      ...(selectedTags.length > 0 && { tags: selectedTags }),
    };

    try {
      const result = await generateMutation.mutateAsync(scope);
      setGeneratedContent(result.content_markdown);
      toast.success('Overview generated successfully!');
    } catch (error: any) {
      if (error.message?.includes('429')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('402')) {
        toast.error('Payment required. Please add credits to your workspace.');
      } else {
        toast.error('Failed to generate overview');
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overview-${format(new Date(), 'yyyy-MM-dd')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded overview');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Project Overview
          </DialogTitle>
        </DialogHeader>

        {!generatedContent ? (
          <div className="space-y-6 py-4">
            {/* Date Range Selection */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2 flex-wrap">
                {datePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange(preset.getValue())}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {dateRange ? `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')}` : 'Custom Range'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange ? { from: dateRange.start, to: dateRange.end } : undefined}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ start: range.from, end: range.to });
                        }
                      }}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Team Members Filter */}
            {members && members.length > 0 && (
              <div className="space-y-2">
                <Label>Team Members (Optional)</Label>
                <div className="flex gap-2 flex-wrap">
                  {members.map((member) => (
                    <Button
                      key={member.user_id}
                      variant={selectedAssignees.includes(member.user_id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedAssignees(prev =>
                          prev.includes(member.user_id)
                            ? prev.filter(id => id !== member.user_id)
                            : [...prev, member.user_id]
                        );
                      }}
                    >
                      {member.name || member.email}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label>Filter by Tags (Optional)</Label>
                <Select
                  value={selectedTags[0] || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setSelectedTags([]);
                    } else {
                      setSelectedTags(prev => 
                        prev.includes(value) 
                          ? prev.filter(t => t !== value)
                          : [...prev, value]
                      );
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      selectedTags.length === 0 
                        ? 'All tags' 
                        : `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tags</SelectItem>
                    {availableTags.map(tag => (
                      <SelectItem key={tag} value={tag}>
                        {tag} {selectedTags.includes(tag) ? '✓' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map(tag => (
                      <span 
                        key={tag}
                        className="text-xs bg-secondary px-2 py-1 rounded cursor-pointer hover:bg-secondary/80"
                        onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                      >
                        {tag} ×
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Scope Preview */}
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Estimated jobs in scope: <span className="font-semibold text-foreground">{estimatedJobCount}</span>
              </p>
              {dateRange && (
                <p className="text-sm text-muted-foreground mt-1">
                  Period: {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}
                </p>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!dateRange || generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Overview...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Overview
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
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
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
