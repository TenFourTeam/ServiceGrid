import { useEffect, useMemo, useRef, useState } from "react";
import { useCustomersData, useQuotesData } from "@/queries/unified";
import { useInvoicesData } from "@/hooks/useInvoicesData";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatMoney } from "@/utils/format";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from "sonner";
import ReschedulePopover from "@/components/WorkOrders/ReschedulePopover";
import type { Job, Quote, JobsCacheData, InvoicesCacheData } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle as ModalTitle } from "@/components/ui/dialog";
import PickQuoteModal from "@/components/Jobs/PickQuoteModal";
import { JobMemberAssignments } from "@/components/Jobs/JobMemberAssignments";
import { useQueryClient } from "@tanstack/react-query";
import { invalidationHelpers, queryKeys } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useNavigate } from 'react-router-dom';
import { useClockInOut } from "@/hooks/useClockInOut";
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from "@/hooks/use-mobile";

interface JobShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Pick<Job, "id" | "customerId" | "startsAt" | "endsAt" | "status" | "jobType" | "isClockedIn" | "businessId" | "ownerId" | "createdAt" | "updatedAt" | "title"> & Partial<Pick<Job, "notes" | "address" | "total" | "photos" | "quoteId" | "clockInTime" | "clockOutTime" | "assignedMembers" | "confirmationToken" | "confirmedAt">>;
  onOpenJobEditModal?: (job: Job) => void;
}

export default function JobShowModal({ open, onOpenChange, job, onOpenJobEditModal }: JobShowModalProps) {
  const { data: customers = [] } = useCustomersData();
  const { data: quotes = [] } = useQuotesData();
  const { data: invoices = [] } = useInvoicesData();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { businessId, userId, role } = useBusinessContext();
  const navigate = useNavigate();
  const [localNotes, setLocalNotes] = useState(job.notes ?? "");
  const notesTimer = useRef<number | null>(null);
  const authApi = useAuthApi();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photosToUpload, setPhotosToUpload] = useState<File[]>([]);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [linkedQuoteId, setLinkedQuoteId] = useState<string | null>(null);
  const [linkedQuoteObject, setLinkedQuoteObject] = useState<Quote | null>(null);
  const [isSendingConfirmation, setIsSendingConfirmation] = useState(false);
  const { clockInOut, isLoading: isClockingInOut } = useClockInOut();
  const { t } = useLanguage();
  
  // Read fresh job data from cache to ensure optimistic updates are reflected
  const cachedJobsData = queryClient.getQueryData<JobsCacheData>(
    queryKeys.data.jobs(businessId || '', userId || '')
  );
  const cachedJob = cachedJobsData?.jobs?.find(j => j.id === job.id);
  
  // Use cached job if available (includes optimistic updates), otherwise use prop
  const displayJob = cachedJob || job;
  
  useEffect(() => {
    setLocalNotes(displayJob.notes ?? "");
  }, [displayJob.id, displayJob.notes]);

  // Clear optimistic state when modal closes
  useEffect(() => {
    if (!open) {
      setLinkedQuoteObject(null);
      setLinkedQuoteId(null);
    }
  }, [open]);

  const customerName = useMemo(() => customers.find(c => c.id === job.customerId)?.name || t('workOrders.modal.customer'), [customers, job.customerId, t]);
  const currentQuoteId = linkedQuoteId === null ? null : (linkedQuoteId || (job as any).quoteId);
  const linkedQuote = useMemo(() => {
    // Use optimistic quote object first, then fall back to cache lookup
    return linkedQuoteObject || (currentQuoteId ? quotes.find(q => q.id === currentQuoteId) : null);
  }, [linkedQuoteObject, quotes, currentQuoteId]);
  const existingInvoice = useMemo(() => invoices.find(inv => inv.jobId === job.id), [invoices, job.id]);
  const photos: string[] = Array.isArray((job as any).photos) ? ((job as any).photos as string[]) : [];

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerOpen(false);
      if (photos.length > 0) {
        if (e.key === 'ArrowRight') setViewerIndex((i) => (i + 1) % photos.length);
        if (e.key === 'ArrowLeft') setViewerIndex((i) => (i - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerOpen, photos.length]);

  async function handleCreateInvoice() {
    if (existingInvoice) {
      navigate('/invoices');
      return;
    }
    
    // For time_and_materials jobs, allow direct invoice creation without quote
    if (job.jobType === 'time_and_materials') {
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
      return;
    }
    
    // For scheduled jobs, require a quote
    if (!currentQuoteId) { 
      setPickerOpen(true); 
      return; 
    }
    
    setIsCreatingInvoice(true);
    
    try {
      const { data: response } = await authApi.invoke('invoices-crud', {
        method: 'POST',
        body: { quoteId: currentQuoteId },
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
  }

  async function handleCompleteJob() {
    setIsCompletingJob(true);
    
    try {
      // If job is clocked in, clock out first
      if (displayJob.isClockedIn) {
        await clockInOut({ jobId: job.id, isClockingIn: false });
        // Wait a moment for the clock out to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const currentTime = new Date().toISOString();
      
      // Optimistic update - immediately update job status in cache
      const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
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
      
      const { error } = await authApi.invoke('jobs-crud', {
        method: 'PUT',
        body: { 
          id: job.id,
          status: 'Completed' 
        },
        toast: {
          success: t('workOrders.modal.complete'),
          loading: displayJob.isClockedIn ? 'Completing & clocking out...' : t('workOrders.modal.completing'),
          error: t('workOrders.modal.complete')
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to mark job as complete');
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    } catch (e: Error | unknown) {
      console.error('Failed to complete job:', e);
      // Rollback optimistic update on error
      const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
      const previousData = queryClient.getQueryData(queryKey);
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
    } finally {
      setIsCompletingJob(false);
    }
  }

  async function handleSendConfirmation() {
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
      const { error } = await authApi.invoke('send-work-order-confirmations', {
        method: 'POST',
        body: { type: 'single', jobId: job.id },
        toast: {
          success: 'Work order confirmation sent successfully',
          loading: 'Sending confirmation...',
          error: 'Failed to send confirmation'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to send confirmation');
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    } catch (error) {
      console.error('Failed to send confirmation:', error);
    } finally {
      setIsSendingConfirmation(false);
    }
  }

  async function handleResendConfirmation() {
    if (!job.startsAt) {
      toast.error('Please schedule the job before resending confirmation');
      return;
    }
    
    if (!window.confirm('Resend confirmation email to customer?')) {
      return;
    }
    
    setIsSendingConfirmation(true);
    
    try {
      const { error } = await authApi.invoke('send-work-order-confirmations', {
        method: 'POST',
        body: { type: 'single', jobId: job.id, resend: true },
        toast: {
          success: 'Work order confirmation resent successfully',
          loading: 'Resending confirmation...',
          error: 'Failed to resend confirmation'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to resend confirmation');
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    } catch (error) {
      console.error('Failed to resend confirmation:', error);
    } finally {
      setIsSendingConfirmation(false);
    }
  }

  async function handlePhotoUpload() {
    if (photosToUpload.length === 0) return;
    
    setUploadingPhotos(true);
    try {
      const existingPhotos = Array.isArray((job as any).photos) ? (job as any).photos : [];
      const newPhotoUrls: string[] = [];
      
      // Upload each photo
      for (const file of photosToUpload) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          const { data, error } = await authApi.invoke('upload-job-photo', {
            method: 'POST',
            body: fd,
            headers: {} // Let browser set Content-Type for FormData
          });
          
          if (error) {
            console.warn('[JobShowModal] Photo upload failed:', error);
            // Continue with other photos even if one fails
          } else if (data?.url) {
            newPhotoUrls.push(data.url as string);
          }
        } catch (error) {
          console.warn('[JobShowModal] Photo upload failed:', error);
          // Continue with other photos even if one fails
        }
      }

      if (newPhotoUrls.length > 0) {
        const allPhotos = [...existingPhotos, ...newPhotoUrls];
        
        // Optimistic update - immediately show photos in cache
        const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
        const previousData = queryClient.getQueryData(queryKey);
        
        queryClient.setQueryData(queryKey, (old: JobsCacheData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            jobs: old.jobs.map((j: Job) => 
              j.id === job.id 
                ? { ...j, photos: allPhotos }
                : j
            )
          };
        });
        
        // Update job with new photos
        const { error: updateError } = await authApi.invoke('jobs-crud', {
          method: 'PUT',
          body: {
            id: job.id,
            photos: allPhotos,
          }
        });
        
        if (updateError) {
          // Rollback optimistic update on error
          if (previousData) {
            queryClient.setQueryData(queryKey, previousData);
          }
          throw new Error(updateError.message || 'Failed to update job photos');
        }
        
        // Invalidate cache to refresh UI
        if (businessId) {
          invalidationHelpers.jobs(queryClient, businessId);
        }
        
        toast.success(`${newPhotoUrls.length} ${newPhotoUrls.length === 1 ? t('workOrders.modal.photos') : t('workOrders.modal.photos')} ${t('workOrders.modal.uploadPhotos')}`);
      }
      
      // Clear selected files
      setPhotosToUpload([]);
    } catch (error) {
      console.error('[JobShowModal] Photo upload failed:', error);
      toast.error(t('workOrders.modal.uploadPhotos'));
    } finally {
      setUploadingPhotos(false);
    }
  }


  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{job.title || t('workOrders.modal.title')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-muted-foreground">{t('workOrders.modal.customer')}</div>
              <div className="font-medium">{customerName}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('workOrders.modal.type')}</div>
              <div className="font-medium capitalize">{job.jobType?.replace('_', ' ') || t('jobs.types.scheduled')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('workOrders.modal.status')}</div>
              <div className="font-medium">{displayJob.status}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('workOrders.modal.starts')}</div>
              <div>{formatDateTime(job.startsAt)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('workOrders.modal.ends')}</div>
              <div>{formatDateTime(job.endsAt)}</div>
            </div>
            {job.jobType === 'time_and_materials' && (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">{t('workOrders.modal.clockIn')}</div>
                  <div>{displayJob.clockInTime ? formatDateTime(displayJob.clockInTime) : '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t('workOrders.modal.clockOut')}</div>
                  <div>{displayJob.clockOutTime ? formatDateTime(displayJob.clockOutTime) : '—'}</div>
                </div>
              </>
            )}
            <div>
              <div className="text-sm text-muted-foreground">{t('workOrders.modal.address')}</div>
              <div className="truncate">{job.address || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('workOrders.modal.total')}</div>
              <div>{typeof job.total === 'number' ? formatMoney(job.total) : '—'}</div>
            </div>
            {linkedQuote && linkedQuote.lineItems && linkedQuote.lineItems.length > 0 && (
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground mb-2">{t('workOrders.modal.lineItems')}</div>
                <div className="space-y-1">
                  {linkedQuote.lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} ({item.qty} {item.unit || 'unit'})</span>
                      <span>{formatMoney(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
            <div className="text-sm text-muted-foreground">{t('workOrders.modal.quote')}</div>
            <div className="flex items-center gap-2">
              {linkedQuote ? (
                <>
                  <span className="font-medium">{linkedQuote.number}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/quotes?highlight=${linkedQuote.id}`);
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    {t('workOrders.modal.view')}
                  </Button>
                  {role === 'owner' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Optimistic update - clear quote immediately
                          setLinkedQuoteId(null);
                          setLinkedQuoteObject(null);
                          
                          const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
                          const previousData = queryClient.getQueryData(queryKey);
                          
          queryClient.setQueryData(queryKey, (old: JobsCacheData | undefined) => {
            if (!old) return old;
            return {
              ...old,
                              jobs: old.jobs.map((j: Job) => 
                                j.id === job.id 
                                  ? { ...j, quoteId: null }
                                  : j
                              )
                            };
                          });
                          
                          const { error } = await authApi.invoke('jobs-crud', {
                            method: 'PUT',
                            body: { 
                              id: job.id, 
                              quoteId: null 
                            },
                            toast: {
                              success: 'Quote unlinked successfully',
                              loading: 'Unlinking quote...',
                              error: 'Failed to unlink quote'
                            }
                          });
                          
                          if (error) {
                            // Rollback optimistic update on error
                            if (previousData) {
                              queryClient.setQueryData(queryKey, previousData);
                            }
                            setLinkedQuoteId(currentQuoteId);
                            setLinkedQuoteObject(linkedQuote);
                            throw new Error(error.message);
                          }
                          
                          if (businessId) {
                            invalidationHelpers.jobs(queryClient, businessId);
                          }
                        } catch (e: Error | unknown) {
                          console.error('Failed to unlink quote:', e);
                        }
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      {t('workOrders.modal.unlink')}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <span>—</span>
                  {role === 'owner' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPickerOpen(true)}
                      className="h-6 px-2 text-xs"
                    >
                      {t('workOrders.modal.link')}
                    </Button>
                  )}
                </>
              )}
            </div>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">{t('workOrders.modal.notes')}</div>
            <Textarea
              value={localNotes}
              onChange={(e)=>{
                const val = e.target.value;
                setLocalNotes(val);
                
                // Optimistic update - immediately update notes in cache
                const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
                queryClient.setQueryData(queryKey, (old: JobsCacheData | undefined) => {
                  if (!old) return old;
                  return {
                    ...old,
                    jobs: old.jobs.map((j: Job) => 
                      j.id === job.id 
                        ? { ...j, notes: val }
                        : j
                    )
                  };
                });
                
                if (notesTimer.current) window.clearTimeout(notesTimer.current);
                notesTimer.current = window.setTimeout(async ()=>{
                    try {
                      const { error } = await authApi.invoke('jobs-crud', {
                        method: 'PUT',
                        body: { 
                          id: job.id,
                          notes: val 
                        }
                      });
                      
                      if (!error && businessId) {
                        invalidationHelpers.jobs(queryClient, businessId);
                      }
                    } catch {}
                }, 600) as unknown as number;
              }}
            />
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-1">{t('workOrders.modal.photos')}</div>
            {Array.isArray((job as any).photos) && (job as any).photos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {(job as any).photos.map((url: string, idx: number) => (
                  <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={url}
                      alt={`Job photo ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-20 object-cover rounded-md border"
                    />
                  </a>
                ))}
              </div>
            ) : (job as any).uploadingPhotos ? (
              <div className="text-sm text-muted-foreground">{t('workOrders.modal.photosUploading')}</div>
            ) : (
              <div className="text-sm text-muted-foreground">{t('workOrders.modal.noPhotos')}</div>
            )}
            
            {/* Photo Upload Section */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setPhotosToUpload(files);
                  }}
                  className="text-sm text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"
                />
              </div>
              {photosToUpload.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {photosToUpload.length} {photosToUpload.length === 1 ? t('workOrders.modal.photos') : t('workOrders.modal.photos')} {t('workOrders.modal.selectPhotos')}
                  </span>
                  <Button 
                    size="sm" 
                    onClick={handlePhotoUpload}
                    disabled={uploadingPhotos}
                  >
                    {uploadingPhotos ? (photos.length > 0 ? t('workOrders.modal.addingPhotos') : t('workOrders.modal.uploadingPhotos')) : t('workOrders.modal.uploadPhotos')}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setPhotosToUpload([])}
                    disabled={uploadingPhotos}
                  >
                    {t('workOrders.modal.cancel')}
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Team Assignment Section */}
          <JobMemberAssignments job={job} />
        </div>
        <DrawerFooter>
          {isMobile ? (
            <div className="flex flex-col gap-2">
              {/* Time tracking actions first */}
              {displayJob.jobType === 'time_and_materials' && (
                <Button
                  variant="outline"
                  onClick={() => clockInOut({ jobId: job.id, isClockingIn: !displayJob.isClockedIn })}
                  disabled={isClockingInOut}
                  className="w-full"
                >
                  {isClockingInOut ? (displayJob.isClockedIn ? 'Stopping...' : t('workOrders.modal.starting')) : (displayJob.isClockedIn ? 'Stop Job' : t('workOrders.modal.startJob'))}
                </Button>
              )}
              
              {/* Secondary actions */}
              <Button 
                variant="outline" 
                onClick={job.confirmationToken ? handleResendConfirmation : handleSendConfirmation}
                className="w-full"
                disabled={isSendingConfirmation || !job.startsAt}
                title={!job.startsAt ? "Please schedule the job before sending confirmation" : ""}
              >
                {isSendingConfirmation 
                  ? (job.confirmationToken ? 'Resending...' : 'Sending...') 
                  : (job.confirmationToken ? 'Resend Confirmation' : 'Send Confirmation')}
              </Button>
              
              {role === 'owner' && (
                <ReschedulePopover job={job as Job} onDone={()=>{
                  if (businessId) {
                    invalidationHelpers.jobs(queryClient, businessId);
                  }
                }} />
              )}
              
              {role === 'owner' && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleCreateInvoice}
                    disabled={isCreatingInvoice || (job.jobType === 'scheduled' && !currentQuoteId && !existingInvoice)}
                    className="w-full"
                  >
                    {isCreatingInvoice ? t('workOrders.modal.creatingInvoice') : existingInvoice ? t('workOrders.modal.viewInvoice') : t('workOrders.modal.createInvoice')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCompleteJob}
                    disabled={displayJob.status === 'Completed' || isCompletingJob || isClockingInOut}
                    className="w-full"
                  >
                    {isCompletingJob ? (displayJob.isClockedIn ? 'Completing & Clocking Out...' : t('workOrders.modal.completing')) : 
                     displayJob.status === 'Completed' ? t('workOrders.modal.completed') : 
                     (displayJob.isClockedIn ? 'Complete & Clock Out' : t('workOrders.modal.complete'))}
                  </Button>
                  
                  {/* Edit action before destructive action */}
                  {onOpenJobEditModal && (
                    <Button 
                      variant="default" 
                      onClick={() => {
                        onOpenJobEditModal(job as Job);
                        onOpenChange(false);
                      }}
                      className="w-full"
                    >
                      Edit Job
                    </Button>
                  )}
                  
                  {/* Destructive action last */}
                  <Button 
                    variant="destructive" 
                    onClick={async () => {
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
                        onOpenChange(false);
                      } catch (e: Error | unknown) {
                        console.error('Failed to delete job:', e);
                      }
                    }}
                    className="w-full"
                  >
                    {t('workOrders.modal.delete')}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Job Actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {role === 'owner' && (
                    <ReschedulePopover job={job as Job} onDone={()=>{
                      if (businessId) {
                        invalidationHelpers.jobs(queryClient, businessId);
                      }
                    }} />
                  )}
                  <Button 
                    variant="outline" 
                    onClick={job.confirmationToken ? handleResendConfirmation : handleSendConfirmation}
                    size="sm"
                    disabled={isSendingConfirmation || !job.startsAt}
                    title={!job.startsAt ? "Please schedule the job before sending confirmation" : ""}
                  >
                  {isSendingConfirmation 
                    ? (job.confirmationToken ? 'Resending...' : 'Sending...') 
                    : (job.confirmationToken ? 'Resend Confirmation' : 'Send Confirmation')}
                  </Button>
                  {displayJob.jobType === 'time_and_materials' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clockInOut({ jobId: job.id, isClockingIn: !displayJob.isClockedIn })}
                      disabled={isClockingInOut}
                    >
                      {isClockingInOut ? (displayJob.isClockedIn ? 'Stopping...' : t('workOrders.modal.starting')) : (displayJob.isClockedIn ? 'Stop Job' : t('workOrders.modal.startJob'))}
                    </Button>
                  )}
                  {role === 'owner' && (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={handleCreateInvoice}
                        disabled={isCreatingInvoice || (job.jobType === 'scheduled' && !currentQuoteId && !existingInvoice)}
                        size="sm"
                      >
                        {isCreatingInvoice ? t('workOrders.modal.creatingInvoice') : existingInvoice ? t('workOrders.modal.viewInvoice') : t('workOrders.modal.createInvoice')}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleCompleteJob}
                        disabled={job.status === 'Completed' || isCompletingJob || isClockingInOut}
                        size="sm"
                      >
                        {isCompletingJob ? (job.isClockedIn ? 'Completing & Clocking Out...' : t('workOrders.modal.completing')) : 
                         job.status === 'Completed' ? t('workOrders.modal.completed') : 
                         (job.isClockedIn ? 'Complete & Clock Out' : t('workOrders.modal.complete'))}
                      </Button>
                    </>
                  )}
                </div>
                {role === 'owner' && (
                    <div className="flex items-center gap-2">
                      {onOpenJobEditModal && (
                        <Button 
                          variant="default" 
                          onClick={() => {
                            onOpenJobEditModal(job as Job);
                            onOpenChange(false);
                          }}
                          size="sm"
                        >
                          Edit Job
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={async () => {
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
                          onOpenChange(false);
                        } catch (e: Error | unknown) {
                          console.error('Failed to delete job:', e);
                        }
                      }}>{t('workOrders.modal.delete')}</Button>
                    </div>
                )}
              </div>
            </div>
          )}
        </DrawerFooter>

        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl" aria-describedby="photo-viewer-description">
            <DialogHeader>
              <ModalTitle>{t('workOrders.modal.photoCount', { current: viewerIndex + 1, total: photos.length })}</ModalTitle>
            </DialogHeader>
            <div id="photo-viewer-description" className="sr-only">
              View and navigate through job photos
            </div>
            {photos.length > 0 && (
              <div className="relative">
                <img
                  src={photos[viewerIndex]}
                  alt={`Job photo ${viewerIndex + 1}`}
                  className="max-h-[70vh] w-full object-contain rounded"
                />
                <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-2">
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={(e)=>{ e.stopPropagation(); setViewerIndex((i)=> (i - 1 + photos.length) % photos.length); }}
                    className="pointer-events-auto px-3 py-2 rounded-md bg-background/60 border"
                  >
                    {t('workOrders.modal.prev')}
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={(e)=>{ e.stopPropagation(); setViewerIndex((i)=> (i + 1) % photos.length); }}
                    className="pointer-events-auto px-3 py-2 rounded-md bg-background/60 border"
                  >
                    {t('workOrders.modal.next')}
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <PickQuoteModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          customerId={job.customerId}
          onSelect={async (quoteId) => {
            try {
              // Find the selected quote and store it optimistically
              const selectedQuote = quotes.find(q => q.id === quoteId);
              
              const { error: linkError } = await authApi.invoke('jobs-crud', {
                method: 'PUT',
                body: { 
                  id: job.id,
                  quoteId 
                }
              });
              
              if (linkError) {
                throw new Error(linkError.message || 'Failed to link quote');
              }
              if (businessId) {
                invalidationHelpers.jobs(queryClient, businessId);
              }
              
              // Set both the ID and the complete quote object optimistically
              setLinkedQuoteId(quoteId);
              setLinkedQuoteObject(selectedQuote);
              
              toast.success('Quote linked to job');
              setPickerOpen(false);
            } catch (e: Error | unknown) {
              toast.error((e instanceof Error ? e.message : null) || 'Failed to link quote');
            }
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}