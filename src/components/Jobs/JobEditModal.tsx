import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomersData } from '@/queries/unified';
import { Customer, Job, JobType } from '@/types';
import { useUpdateJob } from '@/hooks/useJobOperations';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CustomerCombobox } from '@/components/Quotes/CustomerCombobox';
import { CustomerBottomModal } from '@/components/Customers/CustomerBottomModal';
import { JobMemberAssignments } from '@/components/Jobs/JobMemberAssignments';
import { cn } from '@/lib/utils';

interface JobEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
}

export function JobEditModal({ 
  open, 
  onOpenChange,
  job
}: JobEditModalProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [duration, setDuration] = useState('1');
  const [address, setAddress] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [jobType, setJobType] = useState<JobType>('scheduled');
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);

  const { data: customers } = useCustomersData();
  const updateJobMutation = useUpdateJob();
  const { t } = useLanguage();

  // Initialize form with job data when job changes
  useEffect(() => {
    if (job && open) {
      setTitle(job.title || '');
      setAddress(job.address || '');
      setNotes(job.notes || '');
      setAmount(job.total ? (job.total / 100).toString() : '');
      setJobType(job.jobType || 'scheduled');

      // Find and set customer
      const jobCustomer = customers?.find(c => c.id === job.customerId);
      setCustomer(jobCustomer || null);

      // Parse start and end times
      if (job.startsAt) {
        const startDate = new Date(job.startsAt);
        setDate(startDate);
        setStartTime(format(startDate, 'HH:mm'));
      }

      if (job.endsAt) {
        const endDate = new Date(job.endsAt);
        setEndTime(format(endDate, 'HH:mm'));
      }
    }
  }, [job, open, customers]);

  // Calculate duration when times change
  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}:00`);
      const end = new Date(`2000-01-01T${endTime}:00`);
      
      if (end > start) {
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        setDuration(diffHours.toString());
      }
    }
  }, [startTime, endTime]);

  const resetState = () => {
    setCustomer(null);
    setDate(undefined);
    setStartTime('09:00');
    setEndTime('10:00');
    setDuration('1');
    setAddress('');
    setTitle('');
    setNotes('');
    setAmount('');
    setJobType('scheduled');
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const onUpdate = async () => {
    if (!job) return;

    if (!customer) {
      toast.error(t('jobs.messages.selectCustomer'));
      return;
    }

    // Validate date and provide fallback 
    const validDate = date && !isNaN(date.getTime()) ? date : new Date();
    
    if (!validDate) {
      toast.error(t('jobs.messages.selectValidDate'));
      return;
    }

    // Parse date and time with validation
    const start = new Date(validDate);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    
    if (isNaN(startHour) || isNaN(startMinute)) {
      toast.error(t('jobs.messages.invalidStartTime'));
      return;
    }
    
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date(validDate);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    if (isNaN(endHour) || isNaN(endMinute)) {
      toast.error(t('jobs.messages.invalidEndTime'));
      return;
    }
    
    end.setHours(endHour, endMinute, 0, 0);

    // Validate that we have valid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast.error(t('jobs.messages.invalidDateTime'));
      return;
    }

    const updates: Partial<Job> = {
      title: title || undefined,
      customerId: customer.id,
      address: address || customer.address || undefined,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      notes: notes || undefined,
      total: amount ? Math.round(parseFloat(amount) * 100) : undefined,
      jobType,
    };

    try {
      await updateJobMutation.mutateAsync({ jobId: job.id, updates });
      toast.success(t('jobs.messages.updateSuccess'));
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error(t('jobs.messages.updateFailed'));
    }
  };

  if (!job) return null;

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{t('jobs.editTitle')}</DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
            {/* Job Type */}
            <div className="space-y-2">
              <Label htmlFor="jobType">{t('jobs.form.jobType')}</Label>
              <Select value={jobType} onValueChange={(value: JobType) => setJobType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('jobs.types.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">{t('jobs.types.scheduled')}</SelectItem>
                  <SelectItem value="time_and_materials">{t('jobs.types.timeAndMaterials')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t('jobs.form.title')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('jobs.form.titlePlaceholder')}
              />
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <Label>{t('jobs.form.customer')}</Label>
              <CustomerCombobox
                customers={customers || []}
                value={customer?.id || ""}
                onChange={(id) => {
                  const selectedCustomer = customers?.find(c => c.id === id);
                  setCustomer(selectedCustomer || null);
                  // Auto-populate address when customer is selected
                  if (selectedCustomer?.address && !address) {
                    setAddress(selectedCustomer.address);
                  }
                }}
                onCreateCustomer={() => setShowCreateCustomer(true)}
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">{t('jobs.form.address')}</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={customer?.address || t('jobs.form.addressPlaceholder')}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>{t('jobs.form.date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{t('jobs.form.pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="startTime">{t('jobs.form.startTime')}</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">{t('jobs.form.duration')}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder={t('jobs.durations.selectDuration')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">{t('jobs.durations.30min')}</SelectItem>
                  <SelectItem value="1">{t('jobs.durations.1hour')}</SelectItem>
                  <SelectItem value="1.5">{t('jobs.durations.1.5hours')}</SelectItem>
                  <SelectItem value="2">{t('jobs.durations.2hours')}</SelectItem>
                  <SelectItem value="3">{t('jobs.durations.3hours')}</SelectItem>
                  <SelectItem value="4">{t('jobs.durations.4hours')}</SelectItem>
                  <SelectItem value="6">{t('jobs.durations.6hours')}</SelectItem>
                  <SelectItem value="8">{t('jobs.durations.8hours')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">{t('jobs.form.amount')}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('jobs.form.amountPlaceholder')}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t('jobs.form.notes')}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('jobs.form.notesPlaceholder')}
                className="min-h-[80px]"
              />
            </div>

            {/* Team Assignment */}
            {job && <JobMemberAssignments job={job} />}
          </div>

          <DrawerFooter>
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1">
                  {t('jobs.actions.cancel')}
                </Button>
              </DrawerClose>
              <Button 
                onClick={onUpdate} 
                className="flex-1"
                disabled={updateJobMutation.isPending}
              >
                {updateJobMutation.isPending 
                  ? t('jobs.actions.updating') 
                  : t('jobs.actions.updateJob')
                }
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <CustomerBottomModal
        open={showCreateCustomer}
        onOpenChange={setShowCreateCustomer}
        onCustomerCreated={(newCustomer) => {
          setCustomer(newCustomer);
          setShowCreateCustomer(false);
        }}
      />
    </>
  );
}