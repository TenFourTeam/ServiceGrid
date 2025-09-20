import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Calendar, Navigation, FileText, CheckCircle, Trash2, Eye, Edit } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useUpdateJob } from '@/hooks/useJobOperations';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { useQueryClient } from '@tanstack/react-query';
import { invalidationHelpers, queryKeys } from '@/queries/keys';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ReschedulePopover from './ReschedulePopover';
import type { Job } from '@/types';

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
  const { getToken } = useClerkAuth();
  const { businessId } = useBusinessContext();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const updateJob = useUpdateJob();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  const isOwner = userRole === 'owner';
  const canEdit = isOwner;
  const canDelete = isOwner;
  const canComplete = isOwner && job.status !== 'Completed';
  const canCreateInvoice = isOwner && !existingInvoice && job.status === 'Completed';
  const canViewInvoice = existingInvoice;

  const handleNavigate = () => {
    const address = job.address;
    if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    } else {
      toast.error(t('workOrders.modal.navigate'));
    }
  };

  const handleCompleteJob = async () => {
    setIsCompletingJob(true);
    
    const currentTime = new Date().toISOString();
    
    // Optimistic update - immediately update job status in cache
    const queryKey = queryKeys.data.jobs(businessId || '');
    const previousData = queryClient.getQueryData(queryKey);
    
    queryClient.setQueryData(queryKey, (old: any) => {
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
      const { error } = await authApi.invoke(`jobs?id=${job.id}`, {
        method: 'PATCH',
        body: { status: 'Completed', endsAt: currentTime },
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
    } catch (e: any) {
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
        queryClient.setQueryData(queryKeys.data.invoices(businessId), (oldData: any) => {
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
    } catch (e: any) {
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

  const handleDelete = async () => {
    if (!window.confirm(t('workOrders.modal.confirmDelete'))) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const { error } = await authApi.invoke(`jobs?id=${job.id}`, {
        method: 'DELETE',
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
    } catch (e: any) {
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
        <div className="px-2 py-1.5">
          <ReschedulePopover 
            job={job} 
            onDone={() => {
              if (businessId) {
                invalidationHelpers.jobs(queryClient, businessId);
              }
            }} 
          />
        </div>

        {/* Edit Job - Only show if user is owner */}
        {isOwner && onOpenJobEditModal && (
          <DropdownMenuItem onClick={() => onOpenJobEditModal(job)} className="gap-2">
            <Edit className="h-4 w-4" />
            {t('workOrders.actions.editJob')}
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Navigate */}
        {job.address && (
          <DropdownMenuItem onClick={handleNavigate} className="gap-2">
            <Navigation className="h-4 w-4" />
            {t('workOrders.modal.navigate')}
          </DropdownMenuItem>
        )}
        
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