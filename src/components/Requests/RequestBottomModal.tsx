import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, ImagePlus, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { invalidationHelpers } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from "@/utils/authEdgeApi";
import { useCustomersData } from "@/hooks/useCustomersData";
import { CustomerCombobox } from "@/components/Quotes/CustomerCombobox";
import { CustomerBottomModal } from "@/components/Customers/CustomerBottomModal";
import { preferredTimeOptions, statusOptions } from "@/validation/requests";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types";

interface RequestBottomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestCreated?: (request: any) => void;
}

export function RequestBottomModal({ 
  open, 
  onOpenChange, 
  onRequestCreated 
}: RequestBottomModalProps) {
  const queryClient = useQueryClient();
  const { businessId, userId } = useBusinessContext();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const { data: customers = [] } = useCustomersData();
  
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
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);

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
    setUploading(false);
    setLoading(false);
  };

  const handleSave = async () => {
    // Validation
    if (!customer) {
      toast.error("Please select a customer");
      return;
    }
    
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    
    if (!serviceDetails.trim()) {
      toast.error("Service details are required");
      return;
    }

    if (!businessId || !userId) {
      toast.error("Authentication context missing");
      return;
    }

    setLoading(true);
    try {
      // Upload photos first if any
      let photoUrls: string[] = [];
      if (files.length > 0) {
        setUploading(true);
        try {
          photoUrls = await uploadPhotos();
        } catch (uploadError) {
          console.error("Photo upload failed:", uploadError);
          toast.error("Failed to upload photos");
          return;
        } finally {
          setUploading(false);
        }
      }

      const requestData = {
        customer_id: customer.id,
        title: title.trim(),
        property_address: propertyAddress.trim() || null,
        service_details: serviceDetails.trim(),
        preferred_assessment_date: preferredDate ? preferredDate.toISOString() : null,
        alternative_date: alternativeDate.trim() || null,
        preferred_times: preferredTimes,
        status: 'New',
        notes: notes.trim() || null,
        photos: photoUrls,
      };
      
      const { data, error } = await authApi.invoke('requests-crud', {
        method: 'POST',
        body: requestData
      });
        
      if (error) {
        console.error("Error creating request:", error);
        toast.error(`Failed to create request: ${error.message || 'Unknown error'}`);
        return;
      }
      
      toast.success("Request created successfully");
      
      // Call the onRequestCreated callback with the new request data
      if (onRequestCreated && data?.request) {
        onRequestCreated(data.request);
      }
      
      if (businessId) {
        invalidationHelpers.requests(queryClient, businessId);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating request:", error);
      toast.error("Failed to create request");
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

    setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Limit to 5 files
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>New Request</DrawerTitle>
          </DrawerHeader>
          
          <div className="px-4 pb-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Customer */}
              <div className="space-y-2">
                <Label>Customer *</Label>
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
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the request"
                  required
                />
              </div>

              {/* Property Address */}
              <div className="space-y-2">
                <Label htmlFor="property_address">Property Address</Label>
                <Input
                  id="property_address"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder={customer?.address || "Address where service is needed"}
                />
              </div>

              {/* Service Details */}
              <div className="space-y-2">
                <Label htmlFor="service_details">Service Details *</Label>
                <Textarea
                  id="service_details"
                  value={serviceDetails}
                  onChange={(e) => setServiceDetails(e.target.value)}
                  placeholder="Detailed description of the work requested"
                  rows={3}
                  required
                />
              </div>

              {/* Preferred Assessment Date */}
              <div className="space-y-2">
                <Label>Preferred Assessment Date</Label>
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
                      {preferredDate ? format(preferredDate, "PPP") : <span>Pick a date</span>}
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
                <Label>Preferred Times</Label>
                <div className="grid grid-cols-1 gap-2">
                  {preferredTimeOptions.map((time) => (
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
                        {time}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div className="space-y-2">
                <Label>Photos</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="request-photos"
                      disabled={files.length >= 5}
                    />
                    <Label
                      htmlFor="request-photos"
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 border border-dashed rounded-md cursor-pointer hover:bg-muted/50",
                        files.length >= 5 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <ImagePlus className="h-4 w-4" />
                      {files.length >= 5 ? "Maximum 5 photos" : "Add Photos"}
                    </Label>
                  </div>
                  
                  {files.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {files.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
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
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes about this request"
                  rows={2}
                />
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
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || uploading}
                className="flex-1"
              >
                {uploading ? "Uploading Photos..." : loading ? "Creating..." : "Create Request"}
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