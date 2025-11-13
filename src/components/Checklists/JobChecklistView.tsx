import { useState } from 'react';
import { Plus, ListChecks, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobChecklist, useCreateChecklist, type ChecklistItem } from '@/hooks/useJobChecklist';
import { ChecklistItem as ChecklistItemComponent } from './ChecklistItem';
import { TemplatePickerDialog } from './TemplatePickerDialog';

interface JobChecklistViewProps {
  jobId: string;
}

export function JobChecklistView({ jobId }: JobChecklistViewProps) {
  const { data, isLoading } = useJobChecklist(jobId);
  const createChecklist = useCreateChecklist();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const checklist = data?.checklist;
  const progress = data?.progress;

  if (!checklist) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Checklist Yet</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
            Create a checklist to track job completion tasks and requirements.
          </p>
          <Button onClick={() => setShowTemplatePicker(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Checklist
          </Button>
        </CardContent>
      </Card>
    );
  }

  const items = checklist.items || [];
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <>
      <div className="space-y-4">
        {/* Progress Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">{checklist.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {progress?.completed || 0} of {progress?.total || 0} tasks completed
                </p>
              </div>
              {progress && progress.percentage === 100 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Complete!</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={progress?.percentage || 0} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress?.percentage || 0)}% Complete</span>
                {checklist.started_at && !checklist.completed_at && (
                  <span>In Progress</span>
                )}
                {checklist.completed_at && (
                  <span>Completed {new Date(checklist.completed_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Items by Category */}
        <div className="space-y-6">
          {Object.entries(itemsByCategory).map(([category, categoryItems]) => {
            const typedItems = categoryItems as ChecklistItem[];
            return (
              <div key={category} className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {category}
                </h3>
                <div className="space-y-2">
                  {typedItems
                    .sort((a, b) => a.position - b.position)
                    .map((item) => (
                      <ChecklistItemComponent key={item.id} item={item} jobId={jobId} />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TemplatePickerDialog
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        onSelectTemplate={(templateId) => {
          createChecklist.mutate({
            jobId,
            templateId: templateId || undefined,
          });
          setShowTemplatePicker(false);
        }}
      />
    </>
  );
}