import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCustomersData } from '@/hooks/useCustomersData';
import { Customer, Job, JobType } from '@/types';
import { supabase } from '@/integrations/supabase/client';
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
import { cn } from '@/lib/utils';

interface JobBottomModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  onJobCreated?: (job: Job) => void;
}

export function JobBottomModal({ 
  open = false, 
  onOpenChange,
  initialDate,
  initialStartTime,
  initialEndTime,
  onJobCreated
}: JobBottomModalProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [date, setDate] = useState<Date | undefined>(initialDate || new Date());
  const [startTime, setStartTime] = useState(initialStartTime || '09:00');
  const [endTime, setEndTime] = useState(initialEndTime || '10:00');
  const [duration, setDuration] = useState('1');
  const [address, setAddress] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [jobType, setJobType] = useState<JobType>('scheduled');
  const [isCreating, setIsCreating] = useState(false);

  const { data: customers } = useCustomersData();
  const queryClient = useQueryClient();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  // Set initial values when props change
  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (initialStartTime) setStartTime(initialStartTime);
  }, [initialStartTime]);

  useEffect(() => {
    if (initialEndTime) setEndTime(initialEndTime);
  }, [initialEndTime]);

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
    setDate(initialDate || new Date());
    setStartTime(initialStartTime || '09:00');
    setEndTime(initialEndTime || '10:00');
    setDuration('1');
    setAddress('');
    setTitle('');
    setNotes('');
    setAmount('');
    setFiles([]);
    setJobType('scheduled');
    setIsCreating(false);
  };

  const onCreate = async () => {
    if (!customer) {
      toast.error("Please select a customer");
      return;
    }

    if (!date) {
      toast.error("Please select a date");
      return;
    }

    setIsCreating(true);

    try {
      // Parse date and time
      const start = new Date(date);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      start.setHours(startHour, startMinute, 0, 0);

      const end = new Date(date);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      end.setHours(endHour, endMinute, 0, 0);

      const newJob: Partial<Job> = {
        title: title || undefined,
        customerId: customer.id,
        address: address || customer.address || undefined,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        status: 'Scheduled',
        notes: notes || undefined,
        total: amount ? Math.round(parseFloat(amount) * 100) : undefined,
        jobType,
        isClockedIn: false,
      };

      // Create the job using edge function
      const { data: jobData, error: jobError } = await supabase.functions.invoke('jobs-crud', {
        body: JSON.stringify(newJob),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (jobError) {
        throw new Error(jobError.message || 'Failed to create job');
      }

      const createdJob: Job = jobData.job;

      // Update the cache optimistically
      queryClient.setQueryData(['jobs'], (oldJobs: Job[] = []) => {
        return [...oldJobs, createdJob];
      });

      // Handle photo uploads if any
      if (files.length > 0) {
        uploadPhotosAsync(createdJob.id);
      }

      toast.success("Job created successfully");

      onJobCreated?.(createdJob);
      onOpenChange?.(false);
      resetState();

    } catch (error) {
      console.error('Error creating job:', error);
      toast.error("Failed to create job");
    } finally {
      setIsCreating(false);
    }
  };

  const uploadPhotosAsync = async (jobId: string) => {
    if (files.length === 0) return;

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const { data, error } = await supabase.functions.invoke('upload-job-photo', {
          body: formData,
        });

        if (error) {
          throw new Error(error.message || 'Failed to upload photo');
        }

        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Update the job with photo URLs using edge function
      const { data: jobData, error: updateError } = await supabase.functions.invoke('jobs-crud', {
        body: JSON.stringify({ 
          id: jobId,
          photos: uploadedUrls 
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update job with photos');
      }

      const updatedJob = jobData.job;
      
      // Update cache
      queryClient.setQueryData(['jobs'], (oldJobs: Job[] = []) => {
        return oldJobs.map(job => 
          job.id === jobId ? updatedJob : job
        );
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error("Job created but photo upload failed");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Create New Job</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* Job Type */}
          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type</Label>
            <Select value={jobType} onValueChange={(value: JobType) => setJobType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="time_and_materials">Time & Materials</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title (Optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Job title"
            />
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            <CustomerCombobox
              customers={customers || []}
              value={customer?.id || ""}
              onChange={(id) => {
                const selectedCustomer = customers?.find(c => c.id === id);
                setCustomer(selectedCustomer || null);
              }}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={customer?.address || "Job address"}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
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
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
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
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (hours)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">30 minutes</SelectItem>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="1.5">1.5 hours</SelectItem>
                <SelectItem value="2">2 hours</SelectItem>
                <SelectItem value="3">3 hours</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="8">8 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Job notes..."
              rows={3}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="photos">Photos</Label>
            <div className="space-y-2">
              <Input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </DrawerClose>
            <Button 
              onClick={onCreate} 
              disabled={isCreating || !customer || !date}
              className="flex-1"
            >
              {isCreating ? "Creating..." : "Create & Schedule"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}