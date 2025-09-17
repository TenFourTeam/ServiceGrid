import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText, Wrench, Calendar, Archive, Trash } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useCreateQuote } from '@/hooks/useQuoteOperations';
import { useLifecycleEmailIntegration } from '@/hooks/useLifecycleEmailIntegration';
import { useRequestOperations } from '@/hooks/useRequestOperations';
import type { RequestListItem } from '@/hooks/useRequestsData';

interface RequestActionsProps {
  request: RequestListItem;
}

export function RequestActions({ request }: RequestActionsProps) {
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const { triggerJobScheduled } = useLifecycleEmailIntegration();
  const createQuote = useCreateQuote();
  const { updateRequest, deleteRequest } = useRequestOperations();

  const handleConvertToQuote = () => {
    createQuote.mutate({
      customerId: request.customer_id,
      address: request.property_address,
      status: 'Draft',
      notesInternal: `Created from request: ${request.title}\n\nService Details: ${request.service_details}${request.notes ? `\n\nNotes: ${request.notes}` : ''}`,
      depositRequired: false,
      taxRate: 0,
      discount: 0,
    }, {
      onSuccess: (data) => {
        navigate(`/quotes?newQuote=${data.id}`);
      }
    });
  };

  // Helper function to map preferred time to specific hour
  const getPreferredHour = (preferredTimes: string[] = []): number => {
    const firstPreference = preferredTimes[0] || 'Any time';
    
    switch (firstPreference) {
      case 'Morning (8am - 12pm)':
        return 9; // 9:00 AM
      case 'Afternoon (12pm - 5pm)':
        return 13; // 1:00 PM
      case 'Evening (5pm - 8pm)':
        return 17; // 5:00 PM
      case 'Any time':
      default:
        return 9; // Default to 9:00 AM
    }
  };

  // Helper function to get next business day
  const getNextBusinessDay = (): Date => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // If tomorrow is Saturday (6) or Sunday (0), move to Monday
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    return tomorrow;
  };

  // Helper function to calculate assessment start time
  const calculateAssessmentStartTime = (): string => {
    const preferredHour = getPreferredHour(request.preferred_times as string[]);
    
    let assessmentDate: Date;
    
    if (request.preferred_assessment_date) {
      assessmentDate = new Date(request.preferred_assessment_date);
    } else {
      assessmentDate = getNextBusinessDay();
    }
    
    // Set the time based on preferred hour
    assessmentDate.setHours(preferredHour, 0, 0, 0);
    
    // Ensure the time is in the future
    const now = new Date();
    if (assessmentDate <= now) {
      assessmentDate = getNextBusinessDay();
      assessmentDate.setHours(preferredHour, 0, 0, 0);
    }
    
    return assessmentDate.toISOString();
  };

  const handleScheduleAssessment = async () => {
    try {
      // First create the assessment job
      const { data: result } = await authApi.invoke('jobs-crud', {
        method: 'POST',
        body: {
          customerId: request.customer_id,
          title: `${request.title} - Assessment`,
          address: request.property_address,
          notes: `Assessment for request: ${request.title}\n\nService Details: ${request.service_details}${request.notes ? `\n\nNotes: ${request.notes}` : ''}`,
          status: 'Scheduled',
          startsAt: calculateAssessmentStartTime(),
          isAssessment: true,
          requestId: request.id,
        },
        toast: {
          success: `Assessment scheduled successfully`,
          loading: 'Scheduling assessment...',
          error: 'Failed to schedule assessment',
          onSuccess: triggerJobScheduled
        }
      });

      // Then update the request status to 'Scheduled'
      if (result) {
        updateRequest.mutate({
          id: request.id,
          status: 'Scheduled'
        });
        navigate('/work-orders');
      }
    } catch (error) {
      console.error('Failed to schedule assessment:', error);
    }
  };

  const handleConvertToJob = async () => {
    try {
      const { data: result } = await authApi.invoke('jobs-crud', {
        method: 'POST',
        body: {
          customerId: request.customer_id,
          title: request.title,
          address: request.property_address,
          notes: `Created from request: ${request.title}\n\nService Details: ${request.service_details}${request.notes ? `\n\nNotes: ${request.notes}` : ''}`,
          status: 'Scheduled',
          startsAt: request.preferred_assessment_date,
        },
        toast: {
          success: `Job created from request successfully`,
          loading: 'Converting request to job...',
          error: 'Failed to convert request to job',
          onSuccess: triggerJobScheduled
        }
      });

      if (result) {
        navigate('/work-orders');
      }
    } catch (error) {
      console.error('Failed to convert request to job:', error);
    }
  };

  const handleArchive = () => {
    updateRequest.mutate({
      id: request.id,
      status: 'Archived'
    });
  };

  const handleDelete = () => {
    deleteRequest.mutate(request.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleScheduleAssessment(); }} className="gap-2">
          <Calendar className="h-4 w-4" />
          Schedule Assessment
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleConvertToQuote(); }} className="gap-2">
          <FileText className="h-4 w-4" />
          Convert to Quote
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleConvertToJob(); }} className="gap-2">
          <Wrench className="h-4 w-4" />
          Convert to Job
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(); }} className="gap-2">
          <Archive className="h-4 w-4" />
          Archive
        </DropdownMenuItem>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 text-destructive focus:text-destructive">
              <Trash className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Request</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this request? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}