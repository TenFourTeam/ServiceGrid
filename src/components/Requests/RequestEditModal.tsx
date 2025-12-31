import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ImagePlus, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { invalidationHelpers } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuthApi } from '@/hooks/useAuthApi';
import { useCustomersData } from "@/hooks/useCustomersData";
import { useBusinessMembersData } from "@/hooks/useBusinessMembers";
import { CustomerCombobox } from "@/components/Quotes/CustomerCombobox";
import { CustomerBottomModal } from "@/components/Customers/CustomerBottomModal";
import { preferredTimeOptions } from "@/validation/requests";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types";
import type { RequestListItem } from "@/hooks/useRequestsData";
import { useLanguage } from "@/contexts/LanguageContext";

interface RequestEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestListItem | null;
  onRequestUpdated?: () => void;
}

export function RequestEditModal({ 
  open, 
  onOpenChange, 
  request,
  onRequestUpdated 
}: RequestEditModalProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const { data: customers = [] } = useCustomersData();
  const { data: membersResponse } = useBusinessMembersData();
  
  // Form state
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [title, setTitle] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [serviceDetails, setServiceDetails] = useState("");
  const [preferredDate, setPreferredDate] = useState<Date | undefined>(undefined);
  const [alternativeDate, setAlternativeDate] = useState("");
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  
  const teamMembers = membersResponse?.data || [];

  // Populate form when request data changes
  useEffect(() => {
    if (request && open) {
      const requestCustomer = customers.find(c => c.id === request.customer_id);
      setCustomer(requestCustomer || null);
      setTitle(request.title || "");
      setPropertyAddress(request.property_address || "");
      setServiceDetails(request.service_details || "");
      setPreferredDate(request.preferred_assessment_date ? new Date(request.preferred_assessment_date) : undefined);
      setAlternativeDate(request.alternative_date || "");
      setPreferredTimes(request.preferred_times as string[] || []);
      setNotes(request.notes || "");
      setExistingPhotos(request.photos as string[] || []);
      setFiles([]);
      setAssignedTo(request.assigned_to || null);
    }
  }, [request, customers, open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const resetState = () => {
    setCustomer(null);
    setTitle("");
    setPropertyAddress("");
    setServiceDetails("");
    setPreferredDate(undefined);
    setAlternativeDate("");
    setPreferredTimes([]);
    setNotes("");
    setFiles([]);
    setExistingPhotos([]);
    setUploading(false);
    setLoading(false);
    setAssignedTo(null);
  };

  const handleSave = async () => {
    if (!request) return;

    // Validation
    if (!customer) {
      toast.error(t('requests.create.validation.customerRequired'));
      return;
    }
    
    if (!title.trim()) {
      toast.error(t('requests.create.validation.titleRequired'));
      return;
    }
    
    if (!serviceDetails.trim()) {
      toast.error(t('requests.create.validation.detailsRequired'));
      return;
    }

    if (!businessId) {
      toast.error("Authentication context missing");
      return;
    }

    setLoading(true);
    try {
      // Upload new photos first if any
      let newPhotoUrls: string[] = [];
      if (files.length > 0) {
        setUploading(true);
        try {
          newPhotoUrls = await uploadPhotos();
        } catch (uploadError) {
          console.error("Photo upload failed:", uploadError);
          toast.error(t('requests.create.messages.photoUploadFailed'));
          return;
        } finally {
          setUploading(false);
        }
      }

      // Combine existing photos with new ones
      const allPhotos = [...existingPhotos, ...newPhotoUrls];

      const requestData = {
        id: request.id,
        customer_id: customer.id,
        title: title.trim(),
        property_address: propertyAddress.trim() || null,
        service_details: serviceDetails.trim(),
        preferred_assessment_date: preferredDate ? preferredDate.toISOString() : null,
        alternative_date: alternativeDate.trim() || null,
        preferred_times: preferredTimes,
        notes: notes.trim() || null,
        photos: allPhotos,
        assigned_to: assignedTo || null,
      };
      
      const { data, error } = await authApi.invoke('requests-crud', {
        method: 'PUT',
        body: requestData
      });
        
      if (error) {
        console.error("Error updating request:", error);
        toast.error(t('requests.create.messages.error'));
        return;
      }
      
      toast.success("Request updated successfully");
      
      // Call the onRequestUpdated callback
      if (onRequestUpdated) {
        onRequestUpdated();
      }
      
      if (businessId) {
        invalidationHelpers.requests(queryClient, businessId);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error(t('requests.create.messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handleTimeToggle = (time: string) => {
    setPreferredTimes(prev => 
      prev.includes(time) 
        ? prev.filter(t => t !== time)
        : [...prev, time]
    );
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await authApi.invoke('upload-request-photo', {
        method: 'POST',
        body: formData
      });

      if (error) {
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      return data.url;
    });

    return Promise.all(uploadPromises);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const totalPhotos = existingPhotos.length + files.length + selectedFiles.length;
    
    if (totalPhotos > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }

    const validFiles = selectedFiles.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isValidType) {
        toast.error(`${file.name} is not a supported image format`);
        return false;
      }
      
      if (!isValidSize) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  if (!request) return null;

  return (
    <>
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Edit Request</DrawerTitle>
          </DrawerHeader>
          
          <div className="px-4 pb-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Customer */}
              <div className="space-y-2">
                <Label>{t('requests.create.customer')} *</Label>
                <CustomerCombobox
                  customers={customers}
                  value={customer?.id || ""}
                  onChange={(id) => {
                    const selectedCustomer = customers.find(c => c.id === id);
                    setCustomer(selectedCustomer || null);
                  }}
                  onCreateCustomer={() => setShowCreateCustomer(true)}
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('requests.create.requestTitle')} *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('requests.create.titlePlaceholder')}
                  required
                />
              </div>

              {/* Property Address */}
              <div className="space-y-2">
                <Label htmlFor="property_address">{t('requests.create.propertyAddress')}</Label>
                <Input
                  id="property_address"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder={customer?.address || t('requests.create.addressPlaceholder')}
                />
              </div>

              {/* Service Details */}
              <div className="space-y-2">
                <Label htmlFor="service_details">{t('requests.create.serviceDetails')} *</Label>
                <Textarea
                  id="service_details"
                  value={serviceDetails}
                  onChange={(e) => setServiceDetails(e.target.value)}
                  placeholder={t('requests.create.detailsPlaceholder')}
                  rows={3}
                  required
                />
              </div>

              {/* Preferred Assessment Date */}
              <div className="space-y-2">
                <Label>{t('requests.create.preferredDate')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !preferredDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {preferredDate ? format(preferredDate, "PPP") : <span>{t('requests.create.pickDate')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={preferredDate}
                      onSelect={setPreferredDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Alternative Date */}
              <div className="space-y-2">
                <Label htmlFor="alternative_date">Alternative Date</Label>
                <Input
                  id="alternative_date"
                  value={alternativeDate}
                  onChange={(e) => setAlternativeDate(e.target.value)}
                  placeholder="Alternative date or time preference"
                />
              </div>

              {/* Preferred Times */}
              <div className="space-y-2">
                <Label>{t('requests.create.preferredTimes')}</Label>
                <div className="grid grid-cols-1 gap-2">
                  {preferredTimeOptions.map((time) => {
                    const timeMap: Record<string, string> = {
                      'Morning (8am - 12pm)': t('requests.create.times.morning'),
                      'Afternoon (12pm - 5pm)': t('requests.create.times.afternoon'),
                      'Evening (5pm - 8pm)': t('requests.create.times.evening')
                    };
                    
                    return (
                      <div key={time} className="flex items-center space-x-2">
                        <Checkbox
                          id={time}
                          checked={preferredTimes.includes(time)}
                          onCheckedChange={() => handleTimeToggle(time)}
                        />
                        <label
                          htmlFor={time}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {timeMap[time] || time}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Photos */}
              <div className="space-y-2">
                <Label>{t('requests.create.photos')}</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="request-photos"
                      disabled={existingPhotos.length + files.length >= 5}
                    />
                    <Label
                      htmlFor="request-photos"
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 border border-dashed rounded-md cursor-pointer hover:bg-muted/50",
                        existingPhotos.length + files.length >= 5 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <ImagePlus className="h-4 w-4" />
                      {existingPhotos.length + files.length >= 5 ? t('requests.create.photosHelp') : t('requests.create.photos')}
                    </Label>
                  </div>
                  
                  {/* Existing Photos */}
                  {existingPhotos.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Existing Photos</div>
                      <div className="grid grid-cols-2 gap-2">
                        {existingPhotos.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={url}
                              alt={`Existing photo ${index + 1}`}
                              className="w-full h-20 object-cover rounded-md border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 p-0"
                              onClick={() => removeExistingPhoto(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* New Photos */}
                  {files.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">New Photos</div>
                      <div className="grid grid-cols-2 gap-2">
                        {files.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`New photo ${index + 1}`}
                              className="w-full h-20 object-cover rounded-md border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 p-0"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">{t('requests.create.notes')}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('requests.create.notesPlaceholder')}
                  rows={2}
                />
              </div>

              {/* Assign To */}
              <div className="space-y-2">
                <Label>{t('requests.create.assignTo') || 'Assign To'}</Label>
                <Select value={assignedTo || ''} onValueChange={(val) => setAssignedTo(val || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('requests.create.selectTeamMember') || 'Select team member'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.display_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DrawerFooter>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
                className="flex-1"
              >
                {t('requests.create.cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || uploading}
                className="flex-1"
              >
                {uploading ? "Uploading..." : loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Customer Creation Modal */}
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
