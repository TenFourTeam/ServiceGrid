import { useEffect, useMemo, useRef, useState } from "react";
import { useCustomersData, useQuotesData } from "@/queries/unified";
import { useInvoicesData } from "@/hooks/useInvoicesData";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatMoney } from "@/utils/format";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { toast } from "sonner";
import ReschedulePopover from "@/components/WorkOrders/ReschedulePopover";
import type { Job } from "@/types";
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
import { useIsPhone } from "@/hooks/use-phone";

interface JobShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Pick<Job, "id" | "customerId" | "startsAt" | "endsAt" | "status" | "jobType" | "isClockedIn" | "businessId" | "ownerId" | "createdAt" | "updatedAt"> & Partial<Pick<Job, "notes" | "address" | "total" | "photos" | "quoteId" | "clockInTime" | "clockOutTime" | "assignedMembers">>;
  onOpenJobEditModal?: (job: Job) => void;
}

export default function JobShowModal({ open, onOpenChange, job, onOpenJobEditModal }: JobShowModalProps) {
  const { data: customers = [] } = useCustomersData();
  const { data: quotes = [] } = useQuotesData();
  const { data: invoices = [] } = useInvoicesData();
  const isMobile = useIsMobile();
  const isPhone = useIsPhone();
  const isTablet = isMobile && !isPhone;
  const queryClient = useQueryClient();
  const { businessId, userId, role } = useBusinessContext();
  const navigate = useNavigate();
  const [localNotes, setLocalNotes] = useState(job.notes ?? "");
  const notesTimer = useRef<number | null>(null);
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photosToUpload, setPhotosToUpload] = useState<File[]>([]);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [linkedQuoteId, setLinkedQuoteId] = useState<string | null>(null);
  const [linkedQuoteObject, setLinkedQuoteObject] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { clockInOut, isLoading: isClockingInOut } = useClockInOut();
  const { t } = useLanguage();
  
  useEffect(() => {
    setLocalNotes(job.notes ?? "");
  }, [job.id]);

  // Clear optimistic state when modal closes
  useEffect(() => {
    if (!open) {
      setLinkedQuoteObject(null);
      setLinkedQuoteId(null);
    }
  }, [open]);

  const customerName = useMemo(() => customers.find(c => c.id === job.customerId)?.name || t('workOrders.modal.customer'), [customers, job.customerId]);
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
  }

  async function handleCompleteJob() {
    setIsCompletingJob(true);
    
    const currentTime = new Date().toISOString();
    
    // Optimistic update - immediately update job status in cache
    const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
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
        body: { status: 'Completed' },
        toast: {
          success: t('workOrders.modal.complete'),
          loading: t('workOrders.modal.completing'),
          error: t('workOrders.modal.complete')
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to mark job as complete');
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    } catch (e: any) {
      console.error('Failed to complete job:', e);
      // Rollback optimistic update on error
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
    } finally {
      setIsCompletingJob(false);
    }
  }

  function handleNavigate() {
    const customer = customers.find(c => c.id === job.customerId);
    const address = job.address || customer?.address;
    
    if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    } else {
      toast.error(t('workOrders.modal.navigate'));
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
        
        queryClient.setQueryData(queryKey, (old: any) => {
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
        const { error: updateError } = await authApi.invoke(`jobs?id=${job.id}`, {
          method: 'PATCH',
          body: {
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

  async function handleDeleteJob() {
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
      onOpenChange(false);
    } catch (e: any) {
      console.error('Failed to delete job:', e);
    }
  }

  // Create button components to avoid duplication
  const clockInOutButton = job?.jobType === 'time_and_materials' && (
    !job.isClockedIn ? (
      <Button
        variant="default"
        onClick={() => clockInOut({ jobId: job.id, isClockingIn: true })}
        disabled={isClockingInOut}
        className={isPhone ? "w-full" : ""}
      >
        {isClockingInOut ? t('workOrders.modal.starting') : t('workOrders.modal.startJob')}
      </Button>
    ) : (
      <Button
        variant="destructive"
        onClick={() => clockInOut({ jobId: job.id, isClockingIn: false })}
        disabled={isClockingInOut}
        className={isPhone ? "w-full" : ""}
      >
        {isClockingInOut ? t('workOrders.modal.stopping') : t('workOrders.modal.stopJob')}
      </Button>
    )
  );

  const navigateButton = (
    <Button 
      variant="outline" 
      onClick={handleNavigate}
      className={isPhone ? "w-full" : ""}
    >
      {t('workOrders.modal.navigate')}
    </Button>
  );

  const rescheduleButton = role === 'owner' && (
    <ReschedulePopover 
      job={job as Job} 
      onDone={() => {
        if (businessId) {
          invalidationHelpers.jobs(queryClient, businessId);
        }
      }} 
    />
  );

  const invoiceButton = role === 'owner' && (
    <Button 
      variant="outline" 
      onClick={handleCreateInvoice}
      disabled={isCreatingInvoice || (job.jobType === 'scheduled' && !currentQuoteId && !existingInvoice)}
      className={isPhone ? "w-full" : ""}
    >
      {isCreatingInvoice ? t('workOrders.modal.creatingInvoice') : existingInvoice ? t('workOrders.modal.viewInvoice') : t('workOrders.modal.createInvoice')}
    </Button>
  );

  const markCompleteButton = role === 'owner' && (
    <Button 
      variant="outline" 
      onClick={handleCompleteJob}
      disabled={job.status === 'Completed' || isCompletingJob}
      className={isPhone ? "w-full" : ""}
    >
      {isCompletingJob ? t('workOrders.modal.completing') : job.status === 'Completed' ? t('workOrders.modal.completed') : t('workOrders.modal.complete')}
    </Button>
  );

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>{t('workOrders.modal.title')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-muted-foreground">{t('workOrders.modal.customer')}</div>
                <div className="font-semibold">{customerName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('workOrders.modal.status')}</div>
                <div className="font-semibold">{job.status}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('workOrders.modal.starts')}</div>
                <div>{formatDateTime(job.startsAt)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('workOrders.modal.ends')}</div>
                <div>{formatDateTime(job.endsAt)}</div>
              </div>
              {job.address && (
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">{t('workOrders.modal.address')}</div>
                  <div>{job.address}</div>
                </div>
              )}
              {job.total && (
                <div>
                  <div className="text-sm text-muted-foreground">{t('workOrders.modal.total')}</div>
                  <div className="font-semibold">{formatMoney(job.total)}</div>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <div className="text-sm font-medium">{t('workOrders.modal.notes')}</div>
              <Textarea
                value={localNotes}
                onChange={(e) => {
                  setLocalNotes(e.target.value);
                  if (notesTimer.current) clearTimeout(notesTimer.current);
                  notesTimer.current = window.setTimeout(async () => {
                    try {
                      await authApi.invoke(`jobs?id=${job.id}`, {
                        method: 'PATCH',
                        body: { notes: e.target.value }
                      });
                      if (businessId) {
                        invalidationHelpers.jobs(queryClient, businessId);
                      }
                    } catch (error) {
                      console.error('Failed to update notes:', error);
                    }
                  }, 1000);
                }}
                placeholder={t('workOrders.modal.notesPlaceholder')}
                className="min-h-[100px]"
              />
            </div>

            {/* Photos Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{t('workOrders.modal.photos')}</div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setPhotosToUpload(files);
                    }}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded cursor-pointer"
                  >
                    {t('workOrders.modal.selectPhotos')}
                  </label>
                  {photosToUpload.length > 0 && (
                    <Button
                      size="sm"
                      onClick={handlePhotoUpload}
                      disabled={uploadingPhotos}
                    >
                      {uploadingPhotos ? t('workOrders.modal.uploading') : `${t('workOrders.modal.upload')} ${photosToUpload.length}`}
                    </Button>
                  )}
                </div>
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="aspect-square relative cursor-pointer">
                      <img
                        src={photo}
                        alt={`Job photo ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                        onClick={() => {
                          setViewerIndex(index);
                          setViewerOpen(true);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Team Assignment Section */}
            <JobMemberAssignments job={job} />
          </div>
          
          <DrawerFooter className="px-0 pb-safe-area-inset-bottom">
            {isPhone ? (
              // Phone layout - single column stack
              <div className="flex flex-col gap-2">
                {clockInOutButton}
                {navigateButton}
                {rescheduleButton}
                {invoiceButton}
                {markCompleteButton}
                <Button variant="outline" onClick={() => onOpenJobEditModal?.(job as Job)}>
                  Edit Job
                </Button>
                <Button variant="destructive" onClick={handleDeleteJob}>
                  Delete Job
                </Button>
              </div>
            ) : isTablet ? (
              // Tablet layout - 2-column grid
              <div className="grid grid-cols-2 gap-2">
                {clockInOutButton}
                {navigateButton}
                {rescheduleButton}
                {invoiceButton}
                {markCompleteButton}
                <Button variant="outline" onClick={() => onOpenJobEditModal?.(job as Job)}>
                  Edit Job
                </Button>
                <div className="col-span-2">
                  <Button variant="destructive" onClick={handleDeleteJob} className="w-full">
                    Delete Job
                  </Button>
                </div>
              </div>
            ) : (
              // Desktop layout - horizontal
              <div className="flex justify-between">
                <div className="flex gap-2">
                  {clockInOutButton}
                  {navigateButton}
                  {rescheduleButton}
                  {invoiceButton}
                  {markCompleteButton}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenJobEditModal?.(job as Job)}>
                    Edit Job
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteJob}>
                    Delete Job
                  </Button>
                </div>
              </div>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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
            
            const { error: linkError } = await authApi.invoke(`jobs?id=${job.id}`, {
              method: 'PATCH',
              body: { quoteId }
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
          } catch (e: any) {
            toast.error(e?.message || 'Failed to link quote');
          }
        }}
      />
    </>
  );
}