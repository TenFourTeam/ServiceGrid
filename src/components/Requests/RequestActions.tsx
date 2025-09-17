import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText, Wrench, Calendar } from 'lucide-react';
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
  const { updateRequest } = useRequestOperations();

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
          startsAt: request.preferred_assessment_date,
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}