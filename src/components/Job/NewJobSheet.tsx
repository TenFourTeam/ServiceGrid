import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomersData } from '@/queries/unified';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';

import { CustomerCombobox } from '@/components/Quotes/CustomerCombobox';
import type { Customer } from '@/types';

interface NewJobSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
}

export function NewJobSheet({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialDate,
  initialStartTime,
  initialEndTime,
}: NewJobSheetProps = {}) {
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomersData();
  const { toast } = useToast();
  const { getToken } = useClerkAuth();
  // Use customers from React Query hook
  const customersList = customers;
  const comboboxCustomers = useMemo(() => customersList.map((c: any) => ({
    id: c.id,
    businessId: c.businessId || '',
    name: c.name,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    address: c.address ?? undefined,
  } as Customer)), [customersList]);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [addingCustomer, setAddingCustomer] = useState(false);

  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [date, setDate] = useState<Date | undefined>(initialDate || new Date());
  const [startTime, setStartTime] = useState(initialStartTime || '09:00');
  const [durationMin, setDurationMin] = useState(() => {
    if (initialStartTime && initialEndTime) {
      const [startH, startM] = initialStartTime.split(':').map(Number);
      const [endH, endM] = initialEndTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      return Math.max(15, endMins - startMins);
    }
    return 60;
  });
  const [address, setAddress] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState<string>('');

  // Photos (optional)
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // New customer quick add
  const [newCustName, setNewCustName] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  const selectedCustomer = useMemo(() => customersList.find(c => c.id === customerId), [customersList, customerId]);

  useEffect(() => {
    if (selectedCustomer && !address) {
      if (selectedCustomer.address) setAddress(selectedCustomer.address);
    }
  }, [selectedCustomer, address]);

  // Default to first customer when list becomes available
  useEffect(() => {
    if (false && !customerId && customersList.length > 0) {
      setCustomerId(customersList[0].id);
    }
  }, [customerId, customersList]);

  function parseStart(dateVal?: Date, time: string = '09:00') {
    const d = dateVal ? new Date(dateVal) : new Date();
    const [h, m] = time.split(':').map(Number);
    d.setHours(h || 9, m || 0, 0, 0);
    return d;
  }

  async function onCreate() {
    if (!customerId) {
      toast({ title: 'Select a customer', description: 'Please choose or add a customer before creating a job.' });
      return;
    }
    try {
      setCreating(true);
      const start = parseStart(date, startTime);
      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      const totalCents = amount ? Math.max(0, Math.round(parseFloat(amount) * 100)) : undefined;

      // 1) Upload photos via secured Edge Function
      const photoUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const resp = await edgeRequest(fn('upload-job-photo'), {
          method: 'POST',
          body: fd,
        });
        const out = resp as any;
        if (!out?.url) throw new Error('Upload failed');
        photoUrls.push(out.url as string);
      }

      // 2) Create job via Edge Function
      const data = await edgeRequest(fn('jobs'), {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          address: address || selectedCustomer?.address,
          title: title || undefined,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          notes: notes || undefined,
          total: totalCents,
          photos: photoUrls,
        }),
      });
      const created = (data as any)?.row || (data as any)?.job || data;

      // Job creation completed - queries will refetch automatically
      console.log('[NewJobSheet] Job creation completed:', created);
      
      toast({
        title: "Job scheduled",
        description: `Job scheduled for ${selectedCustomer?.name || 'customer'} on ${date}.`,
      });
      
      // Only navigate if not used as controlled modal
      if (!controlledOnOpenChange) {
        navigate('/work-orders');
      }
      
      // Reset form and close
      resetState();
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Failed to create job', description: e?.message || String(e) });
    } finally {
      setCreating(false);
    }
  }

  function resetState() {
    setCustomerId(undefined);
    setDate(initialDate || new Date());
    setStartTime(initialStartTime || '09:00');
    if (initialStartTime && initialEndTime) {
      const [startH, startM] = initialStartTime.split(':').map(Number);
      const [endH, endM] = initialEndTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      setDurationMin(Math.max(15, endMins - startMins));
    } else {
      setDurationMin(60);
    }
    setAddress('');
    setNotes('');
    setTitle('');
    setAmount('');
    setFiles([]);
    setPreviews([]);
    setCreating(false);
    setAddingCustomer(false);
    setNewCustName('');
    setNewCustAddress('');
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      {!controlledOnOpenChange && (
        <SheetTrigger asChild>
          <Button data-testid="new-job-trigger" data-onb="new-job-button">New Job</Button>
        </SheetTrigger>
      )}
      <SheetContent side="right" className="sm:max-w-md flex h-full flex-col">
        <SheetHeader>
          <SheetTitle>New Job</SheetTitle>
          <SheetDescription>Schedule a job quickly. All fields can be edited later.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 animate-fade-in flex-1 min-h-0 overflow-y-auto pl-1 pr-1">
          <div className="space-y-2">
            <Label htmlFor="job-title">Job name</Label>
            <Input id="job-title" placeholder="e.g. Spring cleanup" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {/* Customer */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <CustomerCombobox
              customers={comboboxCustomers}
              value={customerId || ""}
              onChange={(id) => {
                setCustomerId(id);
                const c = (customersList as any[]).find((x: any) => x.id === id);
                if (!address && c?.address) setAddress(c.address);
              }}
              placeholder="Select customer…"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Service address</Label>
            <Input id="address" placeholder="123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start font-normal', !date && 'text-muted-foreground')}>
                    {date ? date.toLocaleDateString() : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Start time</Label>
              <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>

          {/* Duration & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={String(durationMin)} onValueChange={(v) => setDurationMin(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='z-50 bg-background'>
                  {[30, 45, 60, 90, 120, 180].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (optional)</Label>
              <div className="flex items-center gap-2">
                <div className="px-2 text-muted-foreground">$</div>
                <Input id="amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Optional notes for the crew" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label htmlFor="photos">Photos (optional)</Label>
            <Input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(e)=>{
                const f = Array.from(e.target.files || []);
                setFiles(f);
                setPreviews(f.map(file => URL.createObjectURL(file)));
              }}
            />
            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`Preview ${i+1}`} className="w-full h-20 object-cover rounded-md border" />
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button className="w-full" onClick={onCreate} disabled={creating}>{creating ? 'Creating…' : 'Create & schedule'}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
