import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Calendar, FileText, CheckCircle, Trash2, Eye, Edit, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useUpdateJob } from '@/hooks/useJobOperations';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useQueryClient } from '@tanstack/react-query';
import { invalidationHelpers, queryKeys } from '@/queries/keys';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ReschedulePopover from './ReschedulePopover';
import type { Job, JobsCacheData, InvoicesCacheData } from '@/types';

interface WorkOrderActionsProps {
  job: Job;
  userRole: string;
  onOpenJobModal?: (job: Job) => void;
  onOpenJobEditModal?: (job: Job) => void;
  existingInvoice?: any;
}

export function WorkOrderActions({ 
  job, 
  userRole, 
  onOpenJobModal,
  onOpenJobEditModal,
  existingInvoice 
}: WorkOrderActionsProps) {
  const { t } = useLanguage();
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const updateJob = useUpdateJob();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isSendingConfirmation, setIsSendingConfirmation] = useState(false);

  const isOwner = userRole === 'owner';
  const canEdit = isOwner;
  const canDelete = isOwner;
  const canComplete = isOwner && job.status !== 'Completed';
  const canCreateInvoice = isOwner && !existingInvoice && job.status === 'Completed';
  const canViewInvoice = existingInvoice;
  const canSendConfirmation = isOwner && job.customerId && job.address && job.startsAt && !job.confirmationToken;

  const handleCompleteJob = async () => {
    setIsCompletingJob(true);
    
    const currentTime = new Date().toISOString();
    
    // Optimistic update - immediately update job status in cache
    const queryKey = queryKeys.data.jobs(businessId || '');
    const previousData = queryClient.getQueryData(queryKey);
    
    queryClient.setQueryData(queryKey, (old: JobsCacheData | undefined) => {
      if (!old) return old;
      return {
        ...old,
        jobs: old.jobs.map((j: Job) => 
          j.id === job.id 
            ? { ...j, status: 'Completed', endsAt: currentTime }
            : j
        )
      };
    });
    
    try {
      const { error } = await authApi.invoke('jobs-crud', {
        method: 'PUT',
        body: { 
          id: job.id,
          status: 'Completed', 
          endsAt: currentTime 
        },
        toast: {
          success: t('workOrders.modal.complete'),
          loading: t('workOrders.modal.completing'),
          error: t('workOrders.modal.complete')
        }
      });
      
      if (error) {
        // Rollback optimistic update on error
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);
        }
        throw new Error(error.message || 'Failed to complete job');
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    } catch (e: Error | unknown) {
      console.error('Failed to complete job:', e);
    } finally {
      setIsCompletingJob(false);
    }
  };

  const handleCreateInvoice = async () => {
    setIsCreatingInvoice(true);
    
    try {
      const { data: response } = await authApi.invoke('invoices-crud', {
        method: 'POST',
        body: {
          customerId: job.customerId,
          jobId: job.id,
          total: job.total || 0,
          subtotal: job.total || 0,
          taxRate: 0,
          discount: 0
        },
        toast: {
          success: t('workOrders.modal.createInvoice'),
          loading: t('workOrders.modal.creatingInvoice'),
          error: t('workOrders.modal.createInvoice')
        }
      });

      // Optimistic update - add invoice to cache immediately
      if (response?.invoice && businessId) {
        queryClient.setQueryData(queryKeys.data.invoices(businessId), (oldData: InvoicesCacheData | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              invoices: [response.invoice, ...oldData.invoices],
              count: oldData.count + 1
            };
          }
          return { invoices: [response.invoice], count: 1 };
        });
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
      
      navigate('/invoices');
    } catch (e: Error | unknown) {
      console.error('Invoice creation failed:', e);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleViewInvoice = () => {
    if (existingInvoice) {
      navigate('/invoices');
    }
  };

  const handleSendConfirmation = async () => {
    if (!job.startsAt) {
      toast.error('Please schedule the job before sending confirmation');
      return;
    }
    
    if (job.confirmationToken) {
      toast.error('Confirmation already sent for this job. Use "Resend Confirmation" to send again.');
      return;
    }
    
    setIsSendingConfirmation(true);
    
    try {
      const { data, error } = await authApi.invoke('send-work-order-confirmations', {
        method: 'POST',
        body: {
          type: 'single',
          jobId: job.id,
          businessId
        },
        toast: {
          success: 'Confirmation email sent successfully',
          loading: 'Sending confirmation...',
          error: 'Failed to send confirmation email'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send confirmation');
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    } catch (error) {
      console.error('Error sending confirmation:', error);
    } finally {
      setIsSendingConfirmation(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!job.startsAt) {
      toast.error('Please schedule the job before resending confirmation');
      return;
    }
    
    if (!window.confirm('Resend confirmation email to customer?')) {
      return;
    }
    
    setIsSendingConfirmation(true);
    
    try {
      const { data, error } = await authApi.invoke('send-work-order-confirmations', {
        method: 'POST',
        body: {
          type: 'single',
          jobId: job.id,
          businessId,
          resend: true
        },
        toast: {
          success: 'Confirmation email resent successfully',
          loading: 'Resending confirmation...',
          error: 'Failed to resend confirmation email'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to resend confirmation');
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    } catch (error) {
      console.error('Error resending confirmation:', error);
    } finally {
      setIsSendingConfirmation(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('workOrders.modal.confirmDelete'))) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const { error } = await authApi.invoke('jobs-crud', {
        method: 'DELETE',
        body: { id: job.id },
        toast: {
          success: t('workOrders.modal.delete'),
          loading: t('workOrders.modal.delete'),
          error: t('workOrders.modal.delete')
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to delete job');
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    } catch (e: Error | unknown) {
      console.error('Failed to delete job:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background border shadow-md z-50">
        {/* Schedule/Reschedule */}
        <DropdownMenuItem className="gap-2">
          <ReschedulePopover 
            job={job} 
            asDropdownItem={true}
            onDone={() => {
              if (businessId) {
                invalidationHelpers.jobs(queryClient, businessId);
              }
            }} 
          />
        </DropdownMenuItem>

        {/* Edit Job - Only show if user is owner */}
        {isOwner && onOpenJobEditModal && (
          <DropdownMenuItem onClick={() => onOpenJobEditModal(job)} className="gap-2">
            <Edit className="h-4 w-4" />
            {t('workOrders.actions.editJob')}
          </DropdownMenuItem>
        )}

        {/* Send/Resend Confirmation - Show for jobs with customer and address */}
        {isOwner && (
          <>
            {!job.confirmationToken ? (
              <DropdownMenuItem 
                onClick={handleSendConfirmation} 
                disabled={isSendingConfirmation || !canSendConfirmation}
                className="gap-2"
                title={!job.startsAt ? "Job must be scheduled first" : ""}
              >
                <Mail className="h-4 w-4" />
                {isSendingConfirmation ? 'Sending...' : 'Send Confirmation'}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                onClick={handleResendConfirmation} 
                disabled={isSendingConfirmation}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                {isSendingConfirmation ? 'Resending...' : 'Resend Confirmation'}
              </DropdownMenuItem>
            )}
          </>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Invoice Actions */}
        {canViewInvoice && (
          <DropdownMenuItem onClick={handleViewInvoice} className="gap-2">
            <Eye className="h-4 w-4" />
            View Invoice
          </DropdownMenuItem>
        )}
        
        {canCreateInvoice && (
          <DropdownMenuItem 
            onClick={handleCreateInvoice} 
            disabled={isCreatingInvoice}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Create Invoice
          </DropdownMenuItem>
        )}
        
        {/* Complete Job */}
        {canComplete && (
          <DropdownMenuItem 
            onClick={handleCompleteJob} 
            disabled={isCompletingJob}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Complete Job
          </DropdownMenuItem>
        )}
        
        {job.status === 'Completed' && (
          <DropdownMenuItem disabled className="gap-2 opacity-50">
            <CheckCircle className="h-4 w-4" />
            Completed
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Delete */}
        {canDelete && (
          <DropdownMenuItem 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete Job
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}