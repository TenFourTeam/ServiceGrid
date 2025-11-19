import { useState } from 'react';
import { useAIGenerations, useAIGenerationDetail } from '@/hooks/useAIGenerations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Eye, FileText, CheckSquare, Star, Clock, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AIGenerationHistory() {
  const [page, setPage] = useState(1);
  const [generationType, setGenerationType] = useState<'all' | 'invoice_estimate' | 'checklist_generation'>('all');
  const [confidence, setConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);

  const { data, isLoading, error } = useAIGenerations({
    page,
    limit: 20,
    generationType: generationType === 'all' ? undefined : generationType,
    confidence: confidence === 'all' ? undefined : confidence,
  });

  const { data: selectedGeneration } = useAIGenerationDetail(selectedGenerationId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load AI generation history: {error.message}</AlertDescription>
      </Alert>
    );
  }

  const generations = data?.generations || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={generationType} onValueChange={(v: any) => setGenerationType(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="invoice_estimate">Invoice Scans</SelectItem>
            <SelectItem value="checklist_generation">Checklists</SelectItem>
          </SelectContent>
        </Select>

        <Select value={confidence} onValueChange={(v: any) => setConfidence(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by confidence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Confidence</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>AI Generation History</CardTitle>
          <CardDescription>View all AI-generated content and analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {generations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No AI generations found for the selected filters
              </div>
            ) : (
              <>
                {generations.map((gen) => (
                  <div
                    key={gen.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedGenerationId(gen.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon */}
                      <div className="shrink-0">
                        {gen.generation_type === 'invoice_estimate' ? (
                          <FileText className="h-5 w-5 text-primary" />
                        ) : (
                          <CheckSquare className="h-5 w-5 text-secondary" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {gen.generation_type === 'invoice_estimate' 
                            ? 'Invoice Estimate' 
                            : 'Checklist Generation'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(gen.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2">
                        {gen.confidence && (
                          <Badge 
                            variant={
                              gen.confidence === 'high' ? 'default' : 
                              gen.confidence === 'medium' ? 'secondary' : 
                              'outline'
                            }
                          >
                            {gen.confidence}
                          </Badge>
                        )}

                        {gen.feedback_rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{gen.feedback_rating}</span>
                          </div>
                        )}

                        {gen.was_edited && (
                          <Badge variant="outline">Edited</Badge>
                        )}

                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">
                            {(gen.metadata.latencyMs / 1000).toFixed(1)}s
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedGenerationId} onOpenChange={(open) => !open && setSelectedGenerationId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Generation Details
            </DialogTitle>
            <DialogDescription>
              {selectedGeneration && format(new Date(selectedGeneration.created_at), 'MMMM d, yyyy h:mm a')}
            </DialogDescription>
          </DialogHeader>

          {selectedGeneration && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <Badge>
                      {selectedGeneration.generation_type === 'invoice_estimate' 
                        ? 'Invoice Estimate' 
                        : 'Checklist Generation'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Confidence</p>
                    <Badge variant={selectedGeneration.confidence === 'high' ? 'default' : 'secondary'}>
                      {selectedGeneration.confidence || 'N/A'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Model</p>
                    <p className="text-sm text-muted-foreground">{selectedGeneration.metadata.model}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Response Time</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedGeneration.metadata.latencyMs / 1000).toFixed(2)}s
                    </p>
                  </div>
                </div>

                {/* Feedback */}
                {selectedGeneration.feedback_rating && (
                  <div>
                    <p className="text-sm font-medium mb-2">User Feedback</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= selectedGeneration.feedback_rating!
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    {selectedGeneration.feedback_text && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedGeneration.feedback_text}
                      </p>
                    )}
                  </div>
                )}

                {/* Output Data */}
                <div>
                  <p className="text-sm font-medium mb-2">Generated Output</p>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedGeneration.output_data, null, 2)}
                  </pre>
                </div>

                {/* Final Version (if edited) */}
                {selectedGeneration.was_edited && selectedGeneration.final_version && (
                  <div>
                    <p className="text-sm font-medium mb-2">Final Version (After Editing)</p>
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedGeneration.final_version, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
