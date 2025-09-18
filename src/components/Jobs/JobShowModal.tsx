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

interface JobShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Pick<Job, "id" | "customerId" | "startsAt" | "endsAt" | "status" | "jobType" | "isClockedIn" | "businessId" | "createdAt" | "updatedAt"> & Partial<Pick<Job, "notes" | "address" | "total" | "photos" | "quoteId" | "clockInTime" | "clockOutTime" | "assignedMembers">>;
}

export default function JobShowModal({ open, onOpenChange, job }: JobShowModalProps) {
  const { data: customers = [] } = useCustomersData();
  const { data: quotes = [] } = useQuotesData();
  const { data: invoices = [] } = useInvoicesData();
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
  const currentQuoteId = linkedQuoteId || (job as any).quoteId;
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


  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('workOrders.modal.title')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4">
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
              <div className="font-medium">{job.status}</div>
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
                  <div>{job.clockInTime ? formatDateTime(job.clockInTime) : '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t('workOrders.modal.clockOut')}</div>
                  <div>{job.clockOutTime ? formatDateTime(job.clockOutTime) : '—'}</div>
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
                queryClient.setQueryData(queryKey, (old: any) => {
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
                      const { error } = await authApi.invoke(`jobs?id=${job.id}`, {
                        method: 'PATCH',
                        body: { notes: val }
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
                  onClick={handleNavigate}
                  size="sm"
                >
                  {t('workOrders.modal.navigate')}
                </Button>
                {job.jobType === 'time_and_materials' && (
                  <>
                    {!job.isClockedIn && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => clockInOut({ jobId: job.id, isClockingIn: true })}
                        disabled={isClockingInOut}
                      >
                        {isClockingInOut ? t('workOrders.modal.starting') : t('workOrders.modal.startJob')}
                      </Button>
                    )}
                    {job.isClockedIn && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => clockInOut({ jobId: job.id, isClockingIn: false })}
                        disabled={isClockingInOut}
                      >
                        {isClockingInOut ? t('workOrders.modal.stopping') : t('workOrders.modal.stopJob')}
                      </Button>
                    )}
                  </>
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
                      disabled={job.status === 'Completed' || isCompletingJob}
                      size="sm"
                    >
                      {isCompletingJob ? t('workOrders.modal.completing') : job.status === 'Completed' ? t('workOrders.modal.completed') : t('workOrders.modal.complete')}
                    </Button>
                  </>
                )}
              </div>
              {role === 'owner' && (
                  <div className="flex items-center gap-2">
                    <Button variant="destructive" size="sm" onClick={async () => {
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
                    }}>{t('workOrders.modal.delete')}</Button>
                  </div>
              )}
            </div>
          </div>
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
      </DrawerContent>
    </Drawer>
  );
}