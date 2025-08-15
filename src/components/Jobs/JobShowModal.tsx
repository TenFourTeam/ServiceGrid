import { useEffect, useMemo, useRef, useState } from "react";
import { useCustomersData, useQuotesData } from "@/queries/unified";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatMoney } from "@/utils/format";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { toast } from "sonner";
import ReschedulePopover from "@/components/WorkOrders/ReschedulePopover";
import type { Job } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle as ModalTitle } from "@/components/ui/dialog";
import PickQuoteModal from "@/components/Jobs/PickQuoteModal";
import { useQueryClient } from "@tanstack/react-query";
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useNavigate } from 'react-router-dom';

interface JobShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Pick<Job, "id" | "customerId" | "startsAt" | "endsAt" | "status"> & Partial<Pick<Job, "notes" | "address" | "total" | "photos" | "quoteId" >>;
}

export default function JobShowModal({ open, onOpenChange, job }: JobShowModalProps) {
  const { data: customers = [] } = useCustomersData();
  const { data: quotes = [] } = useQuotesData();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const navigate = useNavigate();
  const [localNotes, setLocalNotes] = useState(job.notes ?? "");
  const notesTimer = useRef<number | null>(null);
  const { getToken } = useClerkAuth();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photosToUpload, setPhotosToUpload] = useState<File[]>([]);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  
  useEffect(() => {
    setLocalNotes(job.notes ?? "");
  }, [job.id]);

  const customerName = useMemo(() => customers.find(c => c.id === job.customerId)?.name || "Customer", [customers, job.customerId]);
  const linkedQuote = useMemo(() => (job as any).quoteId ? quotes.find(q => q.id === (job as any).quoteId) : null, [quotes, (job as any).quoteId]);
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
    if (!(job as any).quoteId) { setPickerOpen(true); toast.info('Link a quote to this job before creating an invoice.'); return; }
    
    setIsCreatingInvoice(true);
    toast.info('Creating invoice...');
    
    try {
      const data = await edgeRequest(fn('invoices'), {
        method: 'POST',
        body: JSON.stringify({ jobId: job.id }),
      });
      toast.success('Invoice created');
      navigate('/invoices');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create invoice');
    } finally {
      setIsCreatingInvoice(false);
    }
  }

  async function handleCompleteJob() {
    setIsCompletingJob(true);
    toast.info('Marking job as complete...');
    
    try {
      await edgeRequest(fn(`jobs?id=${job.id}`), {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Completed' }),
      });
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
      
      toast.success('Job marked as complete');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to mark job as complete');
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
      toast.error('No address available for navigation');
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
          const resp = await edgeRequest(fn('upload-job-photo'), {
            method: 'POST',
            body: fd,
          });
          const out = resp as any;
          if (out?.url) {
            newPhotoUrls.push(out.url as string);
          }
        } catch (error) {
          console.warn('[JobShowModal] Photo upload failed:', error);
          // Continue with other photos even if one fails
        }
      }

      if (newPhotoUrls.length > 0) {
        const allPhotos = [...existingPhotos, ...newPhotoUrls];
        
        // Update job with new photos
        await edgeRequest(fn('jobs') + `?id=${job.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            photos: allPhotos,
          }),
        });
        
        // Invalidate cache to refresh UI
        if (businessId) {
          invalidationHelpers.jobs(queryClient, businessId);
        }
        
        toast.success(`${newPhotoUrls.length} photo${newPhotoUrls.length === 1 ? '' : 's'} uploaded successfully`);
      }
      
      // Clear selected files
      setPhotosToUpload([]);
    } catch (error) {
      console.error('[JobShowModal] Photo upload failed:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  }


  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Job Details</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-muted-foreground">Customer</div>
              <div className="font-medium">{customerName}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="font-medium">{job.status}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Starts</div>
              <div>{formatDateTime(job.startsAt)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ends</div>
              <div>{formatDateTime(job.endsAt)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="truncate">{job.address || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div>{typeof job.total === 'number' ? formatMoney(job.total) : '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Quote</div>
              <div className="flex items-center gap-2">
                {linkedQuote ? (
                  <>
                    <span className="font-medium">{linkedQuote.number}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/quotes?highlight=${linkedQuote.id}`);
                      }}
                    >
                      View Quote
                    </Button>
                  </>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Notes</div>
            <Textarea
              value={localNotes}
              onChange={(e)=>{
                const val = e.target.value;
                setLocalNotes(val);
                if (notesTimer.current) window.clearTimeout(notesTimer.current);
                notesTimer.current = window.setTimeout(async ()=>{
                    try {
                      await edgeRequest(fn(`jobs?id=${job.id}`), {
                        method: 'PATCH',
                        body: JSON.stringify({ notes: val }),
                      });
                       if (businessId) {
                         invalidationHelpers.jobs(queryClient, businessId);
                       }
                    } catch {}
                }, 600) as unknown as number;
              }}
            />
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-1">Photos</div>
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
              <div className="text-sm text-muted-foreground">Photos uploading...</div>
            ) : (
              <div className="text-sm text-muted-foreground">No photos yet.</div>
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
                    {photosToUpload.length} photo{photosToUpload.length === 1 ? '' : 's'} selected
                  </span>
                  <Button 
                    size="sm" 
                    onClick={handlePhotoUpload}
                    disabled={uploadingPhotos}
                  >
                    {uploadingPhotos ? (photos.length > 0 ? 'Adding photos...' : 'Uploading photos...') : 'Upload Photos'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setPhotosToUpload([])}
                    disabled={uploadingPhotos}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <DrawerFooter>
          <div className="flex flex-col gap-3">
            {/* Primary Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="default" 
                onClick={handleCompleteJob}
                disabled={job.status === 'Completed' || isCompletingJob}
              >
                {isCompletingJob ? 'Completing...' : job.status === 'Completed' ? 'Completed' : 'Complete Job'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleNavigate}
              >
                Navigate
              </Button>
            </div>
            
            {/* Secondary Actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ReschedulePopover job={job as Job} onDone={()=>{ /* no-op, realtime/subsequent fetch updates UI */ }} />
                {!(job as any).quoteId ? (
                  <Button variant="outline" onClick={() => setPickerOpen(true)}>Link Quote</Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/quotes?highlight=${(job as any).quoteId}`);
                    }}
                  >
                    View Quote
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={handleCreateInvoice}
                  disabled={isCreatingInvoice}
                >
                  {isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
                </Button>
              </div>
              <div>
                <Button variant="destructive" onClick={async () => {
                  try {
                    await edgeRequest(fn(`jobs?id=${job.id}`), { method: 'DELETE' });
                    if (businessId) {
                      invalidationHelpers.jobs(queryClient, businessId);
                    }
                    toast.success('Job deleted');
                    onOpenChange(false);
                  } catch (e: any) {
                    toast.error(e?.message || 'Failed to delete job');
                  }
                }}>Delete</Button>
              </div>
            </div>
          </div>
        </DrawerFooter>

        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <ModalTitle>Photo {viewerIndex + 1} of {photos.length}</ModalTitle>
            </DialogHeader>
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
                    Prev
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={(e)=>{ e.stopPropagation(); setViewerIndex((i)=> (i + 1) % photos.length); }}
                    className="pointer-events-auto px-3 py-2 rounded-md bg-background/60 border"
                  >
                    Next
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
              const data = await edgeRequest(fn(`jobs?id=${job.id}`), {
                method: 'PATCH',
                body: JSON.stringify({ quoteId }),
              });
              if (businessId) {
                invalidationHelpers.jobs(queryClient, businessId);
              }
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