import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useAppStore';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { getClerkTokenStrict } from '@/utils/clerkToken';
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';

export function NewJobSheet() {
  const navigate = useNavigate();
  const { customers, upsertCustomer, upsertJob } = useStore();
  const { toast } = useToast();
  const { getToken } = useClerkAuth();
  const { data: custData } = useSupabaseCustomers();
  const customersList = useMemo(() => (custData?.rows && custData.rows.length > 0 ? custData.rows : customers), [custData, customers]);

  const [open, setOpen] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);

  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [durationMin, setDurationMin] = useState(60);
  const [address, setAddress] = useState('');
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
    if (!customerId && customersList.length > 0) {
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

      // 1) Upload photos to storage
      const photoUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `jobs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('job-photos').upload(path, file, { upsert: false, cacheControl: '3600' });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data } = supabase.storage.from('job-photos').getPublicUrl(path);
        if (!data?.publicUrl) throw new Error('Failed to get public URL');
        photoUrls.push(data.publicUrl);
      }

      // 2) Create job via Edge Function
      const token = await getClerkTokenStrict(getToken);
      const r = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/jobs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          address: address || selectedCustomer?.address,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          notes: notes || undefined,
          total: totalCents,
          photos: photoUrls,
        }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(()=> '');
        throw new Error(`Failed to create job (${r.status}): ${txt}`);
      }
      const data = await r.json().catch(()=>null);
      const created = (data?.row || data?.job || data) as any;

      // 3) Upsert locally for instant UI
      const local = upsertJob({
        id: created?.id,
        customerId,
        address: address || selectedCustomer?.address,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        notes: notes || undefined,
        total: totalCents,
        status: 'Scheduled',
        photos: photoUrls as any,
      } as any);

      setOpen(false);
      toast({ title: 'Job scheduled', description: 'Your job has been created and scheduled.' });
      navigate(`/calendar?job=${local.id || created?.id || ''}`);
      resetState();
    } catch (e: any) {
      toast({ title: 'Failed to create job', description: e?.message || String(e) });
    } finally {
      setCreating(false);
    }
  }

  function onQuickAddCustomer() {
    if (!newCustName.trim()) {
      toast({ title: 'Name required', description: 'Enter a customer name to continue.' });
      return;
    }
    const c = upsertCustomer({ name: newCustName.trim(), address: newCustAddress || undefined });
    setCustomerId(c.id);
    if (c.address) setAddress(c.address);
    setAddingCustomer(false);
    setNewCustName('');
    setNewCustAddress('');
  }

  function resetState() {
    setCustomerId(undefined);
    setDate(new Date());
    setStartTime('09:00');
    setDurationMin(60);
    setAddress('');
    setNotes('');
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
      <SheetTrigger asChild>
        <Button>New Job</Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md flex h-full flex-col">
        <SheetHeader>
          <SheetTitle>New Job</SheetTitle>
          <SheetDescription>Schedule a job quickly. All fields can be edited later.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 animate-fade-in flex-1 min-h-0 overflow-y-auto pl-1 pr-1">
          {/* Customer */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            {customersList.length > 0 && !addingCustomer ? (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className='z-50 bg-background'>
                  {customersList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {customersList.length === 0 || addingCustomer ? (
              <div className="space-y-2">
                <Input placeholder="Customer name" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} />
                <Input placeholder="Address (optional)" value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={onQuickAddCustomer}>Create customer</Button>
                  {customersList.length > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => setAddingCustomer(false)}>Cancel</Button>
                  )}
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="justify-start" onClick={() => setAddingCustomer(true)}>+ Quick add customer</Button>
            )}
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
