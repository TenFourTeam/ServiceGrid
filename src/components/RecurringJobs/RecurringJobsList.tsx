import { useState } from 'react';
import { Calendar, MapPin, Clock, Users, Play, Pause, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RecurringJobTemplate } from '@/hooks/useRecurringJobs';
import { useGenerateRecurringJobs, useUpdateRecurringTemplate, useDeleteRecurringTemplate } from '@/hooks/useRecurringJobs';
import { RecurringJobModal } from './RecurringJobModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RecurringJobsListProps {
  templates: RecurringJobTemplate[];
  isLoading: boolean;
}

export function RecurringJobsList({ templates, isLoading }: RecurringJobsListProps) {
  const { t } = useTranslation();
  const [editingTemplate, setEditingTemplate] = useState<RecurringJobTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const generateJobs = useGenerateRecurringJobs();
  const updateTemplate = useUpdateRecurringTemplate();
  const deleteTemplate = useDeleteRecurringTemplate();

  const handleToggleActive = (template: RecurringJobTemplate) => {
    updateTemplate.mutate({
      id: template.id,
      is_active: !template.is_active,
    });
  };

  const handleGenerate = (templateId: string) => {
    generateJobs.mutate({ templateId, count: 4 });
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteTemplate.mutate(deletingId, {
        onSuccess: () => setDeletingId(null),
      });
    }
  };

  const getPatternLabel = (pattern: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      custom: 'Custom',
    };
    return labels[pattern] || pattern;
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading templates...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No recurring job templates yet.</p>
        <p className="text-sm mt-2">Create your first template to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Pattern</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  <div className="font-medium">{template.customer?.name}</div>
                  {template.address && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {template.address}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>{template.title}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {template.estimated_duration_minutes} min
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getPatternLabel(template.recurrence_pattern)}</Badge>
                  {template.auto_schedule && (
                    <Badge variant="secondary" className="ml-2">Auto</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {template.next_generation_date ? (
                    <div className="text-sm">
                      {format(new Date(template.next_generation_date), 'MMM d, yyyy')}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {template.is_active ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerate(template.id)}
                      disabled={!template.is_active || generateJobs.isPending}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Generate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(template)}
                    >
                      {template.is_active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingId(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingTemplate && (
        <RecurringJobModal
          isOpen={true}
          onClose={() => setEditingTemplate(null)}
          template={editingTemplate}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the recurring job template. Existing generated jobs will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
