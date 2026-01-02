import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText, Wrench, Calendar, Archive, Edit, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useCreateQuote } from '@/hooks/useQuoteOperations';
import { useLifecycleEmailIntegration } from '@/hooks/useLifecycleEmailIntegration';
import { useRequestOperations } from '@/hooks/useRequestOperations';
import type { RequestListItem } from '@/hooks/useRequestsData';
import { useLanguage } from '@/contexts/LanguageContext';
import { RequestEditModal } from './RequestEditModal';
import { useState } from 'react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/queries/keys';

interface RequestActionsProps {
  request: RequestListItem;
}

export function RequestActions({ request }: RequestActionsProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const authApi = useAuthApi();
  const { businessId, userId } = useBusinessContext();
  const queryClient = useQueryClient();
  const { triggerJobScheduled } = useLifecycleEmailIntegration();
  const createQuote = useCreateQuote();
  const { updateRequest } = useRequestOperations();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
          jobType: 'estimate',
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
          photos: request.photos || [],
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

  const handleAssignToMe = async () => {
    if (!userId || !businessId) return;
    try {
      await authApi.invoke('requests-crud', {
        method: 'PUT',
        body: { id: request.id, assigned_to: userId }
      });
      toast.success(t('requests.actions.assignedToYou') || 'Request assigned to you');
      queryClient.invalidateQueries({ queryKey: queryKeys.data.requests(businessId) });
      setDropdownOpen(false);
    } catch (error) {
      console.error('Failed to assign request:', error);
      toast.error('Failed to assign request');
    }
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm border z-50">
          <DropdownMenuItem 
            onClick={(e) => { 
              e.stopPropagation(); 
              setDropdownOpen(false);
              setTimeout(() => setShowEditModal(true), 50);
            }} 
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            {t('requests.actions.edit')}
          </DropdownMenuItem>
          {!request.assigned_to && (
            <DropdownMenuItem 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleAssignToMe();
              }} 
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              {t('requests.actions.assignToMe') || 'Assign to Me'}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={(e) => { 
              e.stopPropagation(); 
              setDropdownOpen(false);
              setTimeout(() => handleScheduleAssessment(), 50);
            }} 
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            {t('requests.actions.scheduleAssessment')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={(e) => { 
              e.stopPropagation(); 
              setDropdownOpen(false);
              setTimeout(() => handleConvertToQuote(), 50);
            }} 
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            {t('requests.actions.convertToQuote')}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => { 
              e.stopPropagation(); 
              setDropdownOpen(false);
              setTimeout(() => handleConvertToJob(), 50);
            }} 
            className="gap-2"
          >
            <Wrench className="h-4 w-4" />
            {t('requests.actions.convertToJob')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={(e) => { 
              e.stopPropagation(); 
              setDropdownOpen(false);
              setTimeout(() => handleArchive(), 50);
            }} 
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            {t('requests.actions.archive')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RequestEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        request={request}
        onRequestUpdated={() => {
          // Refresh will be handled by the query invalidation in the modal
        }}
      />
    </>
  );
}