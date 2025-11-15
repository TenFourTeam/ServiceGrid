import { useState } from 'react';
import { Plus, ListChecks, CheckCircle2, UserCircle, Activity } from 'lucide-react';
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
import { useChecklistAssignment } from '@/hooks/useChecklistAssignment';
import { useBusinessMembersData } from '@/hooks/useBusinessMembers';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface JobChecklistViewProps {
  jobId: string;
}

export function JobChecklistView({ jobId }: JobChecklistViewProps) {
  const { data, isLoading } = useJobChecklist(jobId);
  const createChecklist = useCreateChecklist();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const { assignChecklist } = useChecklistAssignment();
  const { businessId, isLoadingBusiness } = useBusinessContext();
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

  if (!checklist) {
    return (
      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ListChecks className="h-12 w-12 text-muted-foreground" />
        </div>
        
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '8px'
        }}>No Checklist Yet</h3>
        
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          marginBottom: '16px',
          textAlign: 'center',
          maxWidth: '420px'
        }}>
          Create a checklist to track job completion tasks and requirements.
        </p>
        
        <button
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            window.alert('🚨 STEP 1: Button was clicked!');
            console.log('🚨 EMERGENCY LOG: Button clicked');
            console.log('🚨 jobId:', jobId);
            console.log('🚨 businessId:', businessId);
            console.log('🚨 createChecklist object:', createChecklist);
            console.log('🚨 createChecklist.mutate type:', typeof createChecklist?.mutate);
            console.log('🚨 createChecklist.isPending:', createChecklist.isPending);
            
            window.alert('🚨 STEP 2: About to open template picker');
            setShowTemplatePicker(true);
            console.log('🚨 setShowTemplatePicker(true) called');
            console.log('🚨 Current showTemplatePicker state:', showTemplatePicker);
            
            window.alert('🚨 STEP 3: Template picker should be opening now');
          }}
        >
          <Plus className="h-4 w-4" />
          🔧 CREATE CHECKLIST (DEBUG MODE)
        </button>
        
        {showTemplatePicker && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            border: '3px solid #ef4444',
            borderRadius: '8px',
            backgroundColor: '#fee2e2'
          }}>
            <p style={{ color: '#991b1b', fontWeight: 'bold' }}>
              ⚠️ TEMPLATE PICKER IS OPEN (showTemplatePicker = true)
            </p>
          </div>
        )}
        
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div><strong>Debug Info:</strong></div>
          <div>jobId: {jobId}</div>
          <div>businessId: {businessId}</div>
          <div>showTemplatePicker: {showTemplatePicker.toString()}</div>
          <div>createChecklist.isPending: {createChecklist.isPending.toString()}</div>
        </div>
      </div>
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
                  value={checklist.assigned_to || ''}
                  onValueChange={(userId) => assignChecklist.mutate({ 
                    checklistId: checklist.id, 
                    assignedTo: userId || null 
                  })}
                >
                  <SelectTrigger className="w-[200px]">
                    <UserCircle className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {members?.map(member => (
                      <SelectItem key={member.id} value={member.id}>
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

      <TemplatePickerDialog
        open={showTemplatePicker}
        onOpenChange={(open) => {
          console.log('🔘 Dialog state changing to:', open);
          setShowTemplatePicker(open);
        }}
        onSelectTemplate={(templateId) => {
          console.log('🔘 Template selected:', templateId);
          console.log('🔘 About to call createChecklist.mutate with:', {
            jobId,
            templateId: templateId || undefined,
            businessId,
          });
          
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