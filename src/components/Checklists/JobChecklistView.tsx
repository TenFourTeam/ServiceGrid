import { useState } from 'react';
import { Plus, ListChecks, CheckCircle2, UserCircle, Activity, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useJobChecklist, useCreateChecklist, type ChecklistItem } from '@/hooks/useJobChecklist';
import { ChecklistItem as ChecklistItemComponent } from './ChecklistItem';
import { ChecklistActivityFeed } from './ChecklistActivityFeed';
import { TemplatePickerDialog } from './TemplatePickerDialog';
import { DraftChecklistBanner } from './DraftChecklistBanner';
import { ChecklistApprovalDialog } from './ChecklistApprovalDialog';
import { AddTaskDialog } from './AddTaskDialog';
import { useChecklistAssignment } from '@/hooks/useChecklistAssignment';
import { useBusinessMembersData } from '@/hooks/useBusinessMembers';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface JobChecklistViewProps {
  jobId: string;
  onGenerateFromPhoto?: () => void;
}

export function JobChecklistView({ jobId, onGenerateFromPhoto }: JobChecklistViewProps) {
  const { data, isLoading } = useJobChecklist(jobId);
  const createChecklist = useCreateChecklist();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const { assignChecklist } = useChecklistAssignment();
  const { businessId, isLoadingBusiness, role } = useBusinessContext();
  const { data: members } = useBusinessMembersData({ businessId });

  // Debug logging
  console.log('🔘 JobChecklistView render:', { 
    jobId, 
    businessId, 
    isLoadingBusiness,
    hasChecklist: !!data?.checklist,
    mutationObject: {
      mutate: typeof createChecklist.mutate,
      isPending: createChecklist.isPending,
    }
  });

  if (isLoading || isLoadingBusiness) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Guard for missing businessId
  if (!businessId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-destructive">
            Business context not available. Please refresh the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  const checklist = data?.checklist;
  const progress = data?.progress;
  const isDraft = checklist?.status === 'draft';
  const canManage = role !== 'worker';

  // Prepare items grouped by category
  const items = checklist?.items || [];
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <>
      {isDraft && canManage && (
        <DraftChecklistBanner onReview={() => setShowApprovalDialog(true)} />
      )}
      
      {showApprovalDialog && checklist && (
        <ChecklistApprovalDialog
          open={showApprovalDialog}
          onOpenChange={setShowApprovalDialog}
          checklist={checklist}
          jobId={jobId}
        />
      )}
      
      {!checklist ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Checklist Yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Create a checklist to track job completion tasks and requirements.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setShowTemplatePicker(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Checklist
              </Button>
              {onGenerateFromPhoto && (
                <Button onClick={onGenerateFromPhoto} variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate from Photo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Progress Header */}
          <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl">{checklist.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {progress?.completed || 0} of {progress?.total || 0} tasks completed
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Assign Checklist */}
                <Select
                  value={checklist.assigned_to || 'unassigned'}
                  onValueChange={(userId) => assignChecklist.mutate({ 
                    checklistId: checklist.id, 
                    assignedTo: userId === 'unassigned' ? null : userId 
                  })}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <UserCircle className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members?.map(member => (
                      <SelectItem key={member.id} value={member.user_id}>
                        {member.name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {progress && progress.percentage === 100 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Complete!</span>
                  </div>
                )}
              </div>
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

        {/* Tabs for Items and Activity */}
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="items" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Items ({items.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-6">
            <div className="space-y-6">
              {canManage && (
                <div className="flex justify-end">
                  <AddTaskDialog
                    checklistId={checklist.id}
                    jobId={jobId}
                    existingCategories={Object.keys(itemsByCategory)}
                  />
                </div>
              )}
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
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <ChecklistActivityFeed checklistId={checklist.id} />
          </TabsContent>
        </Tabs>
      </div>
      )}

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