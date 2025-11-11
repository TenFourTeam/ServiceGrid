import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Upload, MapPin, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCustomersData } from '@/queries/unified';
import { Customer, Job, JobType } from '@/types';
import { useAuth } from '@clerk/clerk-react';
import { useAuthApi } from "@/hooks/useAuthApi";
import { queryKeys } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessMembersData } from '@/hooks/useBusinessMembers';
import { useJobAssignments } from '@/hooks/useJobAssignments';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ConflictDetector } from '@/components/Calendar/ConflictDetector';
import { useJobsData } from '@/hooks/useJobsData';
import { useGPSLocation } from '@/hooks/useGPSLocation';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { MapCircle } from '@/components/ui/map-circle';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';

interface JobBottomModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: 'full' | 'peek';
  onModeChange?: (mode: 'full' | 'peek') => void;
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  onJobCreated?: (job: Job) => void;
}

export function JobBottomModal({ 
  open = false, 
  onOpenChange,
  mode = 'full',
  onModeChange,
  initialDate,
  initialStartTime,
  initialEndTime,
  onJobCreated
}: JobBottomModalProps) {
  // Service area radius in meters (5 miles = 8047 meters)
  const SERVICE_RADIUS_METERS = 5 * 1609.34;
  
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
  const [jobType, setJobType] = useState<JobType>('appointment');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [priority, setPriority] = useState(3); // Default: Normal priority
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { data: customers } = useCustomersData();
  const { data: allMembers } = useBusinessMembersData();
  const queryClient = useQueryClient();
  const { businessId, userId } = useBusinessContext();
  const { data: jobsData } = useJobsData(businessId);
  const { assignMembers } = useJobAssignments();
  const authApi = useAuthApi();
  const { t } = useLanguage();
  const { getCurrentLocation, isLoading: isGettingLocation, error: gpsError } = useGPSLocation();

  // Add reverse geocode query (only runs when gpsCoords is set)
  const { data: reverseGeocodedAddress, isLoading: isReverseGeocoding } = useReverseGeocode(
    gpsCoords?.lat || null,
    gpsCoords?.lng || null,
    !!gpsCoords
  );

  // Fetch Google Maps API key for Places Autocomplete
  const { data: googleMapsApiKey, isLoading: isLoadingApiKey } = useGoogleMapsApiKey();
  
  // Places autocomplete for getting coordinates from selected address
  const { getPlaceDetails } = usePlacesAutocomplete();
  const [isFetchingPlaceDetails, setIsFetchingPlaceDetails] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Auto-populate address when reverse geocoding completes
  useEffect(() => {
    if (reverseGeocodedAddress?.address && gpsCoords) {
      setAddress(reverseGeocodedAddress.address);
      toast.success('Address populated from GPS');
    }
  }, [reverseGeocodedAddress, gpsCoords]);

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
    setJobType('appointment');
    setIsCreating(false);
    setAssignedMemberIds([]);
  };

  const onCreate = async () => {
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

    if (!businessId) {
      toast.error(t('jobs.messages.businessNotAvailable'));
      return;
    }

    setIsCreating(true);

    // Parse date and time with validation
    const start = new Date(validDate);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    
    // Validate time parsing
    if (isNaN(startHour) || isNaN(startMinute)) {
      toast.error(t('jobs.messages.invalidStartTime'));
      setIsCreating(false);
      return;
    }
    
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date(validDate);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    // Validate time parsing
    if (isNaN(endHour) || isNaN(endMinute)) {
      toast.error(t('jobs.messages.invalidEndTime'));
      setIsCreating(false);
      return;
    }
    
    end.setHours(endHour, endMinute, 0, 0);

    // Validate that we have valid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast.error(t('jobs.messages.invalidDateTime'));
      setIsCreating(false);
      return;
    }

    // Create optimistic job with temporary ID
    const optimisticJob: Job = {
      id: `temp-${Date.now()}`, // Temporary ID for optimistic update
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
      businessId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Job;

    // Store previous data for rollback - use same query key pattern as useJobsData
    const jobsQueryKey = queryKeys.data.jobs(businessId, userId || '');
    const previousData = queryClient.getQueryData(jobsQueryKey);

    console.log("[JobBottomModal] Optimistic update - adding job to cache with key:", jobsQueryKey);

    // Optimistic update - show job immediately
    queryClient.setQueryData(jobsQueryKey, (oldData: { jobs: Job[], count: number } | undefined) => {
      const currentJobs = oldData?.jobs || [];
      const currentCount = oldData?.count || 0;
      return {
        jobs: [...currentJobs, optimisticJob],
        count: currentCount + 1
      };
    });

    // Close modal and show optimistic state immediately
    onJobCreated?.(optimisticJob);
    onOpenChange?.(false);
    resetState();

    try {
      const newJobData = {
        title: title || undefined,
        customerId: customer.id,
        address: address || customer.address || undefined,
        latitude: gpsCoords?.lat,
        longitude: gpsCoords?.lng,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        status: 'Scheduled',
        notes: notes || undefined,
        total: amount ? Math.round(parseFloat(amount) * 100) : undefined,
        jobType,
        isClockedIn: false,
        priority, // AI scheduling field
        estimatedDurationMinutes: duration ? Math.round(parseFloat(duration) * 60) : undefined, // AI scheduling field
      };

      // Create the job using edge function
      const { data: jobData, error: jobError } = await authApi.invoke('jobs-crud', {
        method: 'POST',
        body: newJobData
      });

      if (jobError) {
        throw new Error(jobError.message || 'Failed to create job');
      }

      const createdJob: Job = jobData.job;

      // Assign selected team members to the job
      if (assignedMemberIds.length > 0) {
        try {
          await assignMembers.mutateAsync({ 
            jobId: createdJob.id, 
            userIds: assignedMemberIds 
          });
        } catch (assignError) {
          console.error('Failed to assign members:', assignError);
          toast.error('Job created but failed to assign members');
        }
      }

      // Replace optimistic job with real job data
      queryClient.setQueryData(jobsQueryKey, (oldData: { jobs: Job[], count: number } | undefined) => {
        const currentJobs = oldData?.jobs || [];
        const currentCount = oldData?.count || 0;
        return {
          jobs: currentJobs.map(job => 
            job.id === optimisticJob.id ? createdJob : job
          ),
          count: currentCount
        };
      });

      // Handle photo uploads if any
      if (files.length > 0) {
        uploadPhotosAsync(createdJob.id);
      }

      toast.success(t('jobs.messages.createSuccess'));

    } catch (error) {
      console.error('Error creating job:', error);
      
      // Rollback optimistic update on error
      if (previousData) {
        queryClient.setQueryData(jobsQueryKey, previousData);
      }
      
      toast.error(t('jobs.messages.createFailed'));
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

        const { data, error } = await authApi.invoke('upload-job-photo', {
          method: 'POST',
          body: formData
        });

        if (error) {
          throw new Error(error.message || 'Failed to upload photo');
        }

        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Update the job with photo URLs using edge function
      const { data: jobData, error: updateError } = await authApi.invoke('jobs-crud', {
        method: 'PUT',
        body: { 
          id: jobId,
          photos: uploadedUrls 
        }
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update job with photos');
      }

      const updatedJob = jobData.job;
      
      // Update cache with correct query key
      if (businessId && userId) {
        const jobsQueryKey = queryKeys.data.jobs(businessId, userId);
        queryClient.setQueryData(jobsQueryKey, (oldData: { jobs: Job[], count: number } | undefined) => {
          const currentJobs = oldData?.jobs || [];
          return {
            jobs: currentJobs.map(job => 
              job.id === jobId ? updatedJob : job
            ),
            count: oldData?.count || 0
          };
        });
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error(t('jobs.messages.photoUploadFailed'));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePeekClick = () => {
    if (mode === 'peek') {
      onModeChange?.('full');
    }
  };

  const handleUseMyLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setGpsCoords({
        lat: location.latitude,
        lng: location.longitude
      });
      toast.success('Location acquired! Fetching address...');
    } catch (error) {
      toast.error(gpsError || 'Failed to get location');
    }
  };

  const formatTimeRange = () => {
    if (!startTime || !endTime || !date) return '';
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    const startStr = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const endStr = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    return `${startStr} → ${endStr} ${diffHours}hr`;
  };

  const formatDate = () => {
    if (!date) return '';
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (mode === 'peek') {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[120px]" onClick={handlePeekClick}>
          <div className="flex-1 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">{t('jobs.eventTitle')}</h3>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('jobs.form.titlePlaceholder')}
                  className="text-base border-none p-0 h-auto focus-visible:ring-0"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>{formatTimeRange()}</div>
                <div>{formatDate()}</div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (!googleMapsApiKey && !isLoadingApiKey) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        {googleMapsApiKey ? (
          <APIProvider apiKey={googleMapsApiKey}>
            <DrawerHeader>
              <DrawerTitle>{t('jobs.createTitle')}</DrawerTitle>
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
                  <SelectItem value="estimate">{t('jobs.types.estimate')}</SelectItem>
                  <SelectItem value="appointment">{t('jobs.types.appointment')}</SelectItem>
                  <SelectItem value="time_and_materials">{t('jobs.types.timeAndMaterials')}</SelectItem>
                </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority.toString()} onValueChange={(value) => setPriority(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">🔴 Urgent</SelectItem>
                <SelectItem value="2">🟠 High</SelectItem>
                <SelectItem value="3">🟡 Normal</SelectItem>
                <SelectItem value="4">🟢 Low</SelectItem>
                <SelectItem value="5">⚪ Lowest</SelectItem>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="address">{t('jobs.form.address')}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUseMyLocation}
                disabled={isGettingLocation || isReverseGeocoding}
                className="h-8 px-2 text-xs"
              >
                {isGettingLocation || isReverseGeocoding ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    {isGettingLocation ? 'Getting location...' : 'Fetching address...'}
                  </>
                ) : (
                  <>
                    <MapPin className="h-3 w-3 mr-1" />
                    Use My Location
                  </>
                )}
                    </Button>
                  </div>
                  <AddressAutocomplete
                    id="address"
                    value={address}
                    onChange={setAddress}
                    onPlaceSelect={async (placeId, description) => {
                      console.log('Selected place:', placeId, description);
                      setIsFetchingPlaceDetails(true);
                      try {
                        const details = await getPlaceDetails(placeId);
                        setGpsCoords({
                          lat: details.lat,
                          lng: details.lng
                        });
                        toast.success('Address and coordinates set');
                      } catch (error) {
                        console.error('Failed to get place details:', error);
                        toast.error('Could not get coordinates for this address');
                      } finally {
                        setIsFetchingPlaceDetails(false);
                      }
                    }}
                    placeholder={customer?.address || t('jobs.form.addressPlaceholder')}
                  />
                  {gpsCoords && (
                    <p className="text-xs text-muted-foreground">
                      📍 GPS: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                    </p>
                  )}
                  {gpsCoords && (
                    <div className="mt-3 space-y-2">
                      <div 
                        key={`${gpsCoords.lat}-${gpsCoords.lng}`}
                        className="rounded-lg overflow-hidden border shadow-sm animate-in fade-in-50 slide-in-from-top-2 duration-300"
                      >
                        <Map
                          mapId="job-location-preview"
                          defaultCenter={gpsCoords}
                          defaultZoom={15}
                          gestureHandling="cooperative"
                          disableDefaultUI={false}
                          style={{ width: '100%', height: '250px' }}
                          mapTypeControl={false}
                          streetViewControl={false}
                          fullscreenControl={false}
                          zoomControl={true}
                        >
                          {/* Service area radius circle */}
                          <MapCircle
                            center={gpsCoords}
                            radius={SERVICE_RADIUS_METERS}
                            strokeColor="#3b82f6"
                            strokeOpacity={0.8}
                            strokeWeight={2}
                            fillColor="#3b82f6"
                            fillOpacity={0.15}
                          />
                          
                          {/* Marker stays on top of circle */}
                          <AdvancedMarker position={gpsCoords}>
                            <div className="relative flex items-center justify-center">
                              <div 
                                className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" 
                                style={{ width: '40px', height: '40px', left: '-5px', top: '-5px' }} 
                              />
                              <div className="relative flex items-center justify-center rounded-full bg-primary shadow-lg border-2 border-white w-10 h-10 z-10">
                                <MapPin className="text-white w-6 h-6" />
                              </div>
                            </div>
                          </AdvancedMarker>
                        </Map>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        📍 Selected location • 5 mile service radius
                      </p>
                    </div>
                  )}
                  {gpsError && (
                    <p className="text-xs text-destructive">{gpsError}</p>
                  )}
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
              min="0"
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
              rows={3}
            />
          </div>

          {/* Team Member Assignment */}
          <div className="space-y-2">
            <Label>{t('jobs.form.assignMembers')}</Label>
            {allMembers && allMembers.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                {allMembers.map(member => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={assignedMemberIds.includes(member.user_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAssignedMemberIds(prev => [...prev, member.user_id]);
                        } else {
                          setAssignedMemberIds(prev => prev.filter(id => id !== member.user_id));
                        }
                      }}
                    />
                    <label 
                      htmlFor={`member-${member.id}`} 
                      className="text-sm cursor-pointer flex-1"
                    >
                      {member.name || member.email} ({member.role})
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('jobs.form.noMembersAvailable')}</p>
            )}
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="photos">{t('jobs.form.photos')}</Label>
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
                        {t('jobs.actions.remove')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conflict Detection */}
          {date && startTime && endTime && (
            <ConflictDetector
              proposedJob={{
                startTime: new Date(`${date.toDateString()} ${startTime}`),
                endTime: new Date(`${date.toDateString()} ${endTime}`),
                address
              }}
              existingJobs={jobsData?.data || []}
            />
          )}
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                {t('jobs.actions.cancel')}
              </Button>
            </DrawerClose>
            <Button 
              onClick={onCreate} 
              disabled={isCreating || !customer || !date}
              className="flex-1"
            >
              {isCreating ? t('jobs.actions.creating') : t('jobs.actions.createSchedule')}
            </Button>
          </div>
        </DrawerFooter>
          </APIProvider>
        ) : (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        )}
      </DrawerContent>
      
      {/* Inline Customer Creation Modal */}
      <CustomerBottomModal
        open={showCreateCustomer}
        onOpenChange={setShowCreateCustomer}
        onCustomerCreated={(newCustomer) => {
          setCustomer(newCustomer);
          setShowCreateCustomer(false);
        }}
      />
    </Drawer>
  );
}