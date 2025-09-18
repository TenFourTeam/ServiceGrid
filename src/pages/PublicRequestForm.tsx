import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, CheckCircle, Building2, ImagePlus, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { preferredTimeOptions } from "@/validation/requests";
import { supabase } from "@/integrations/supabase/client";

interface Business {
  id: string;
  name: string;
  logo_url?: string;
  light_logo_url?: string;
}

export default function PublicRequestForm() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  
  // Business data (populated after submission)
  const [business, setBusiness] = useState<Business | null>(null);
  
  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
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
  const [success, setSuccess] = useState(false);

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

  const uploadPhotos = async (): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('upload-request-photo', {
        body: formData
      });

      if (error) {
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      return data.url;
    });

    return Promise.all(uploadPromises);
  };

  const handleTimeToggle = (time: string) => {
    setPreferredTimes(prev => 
      prev.includes(time) 
        ? prev.filter(t => t !== time)
        : [...prev, time]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!customerEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    
    if (!title.trim()) {
      toast.error("Request title is required");
      return;
    }
    
    if (!serviceDetails.trim()) {
      toast.error("Service details are required");
      return;
    }

    if (!businessId) {
      toast.error("Invalid business ID");
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
        business_id: businessId,
        customer_name: customerName.trim() || null,
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        title: title.trim(),
        property_address: propertyAddress.trim() || null,
        service_details: serviceDetails.trim(),
        preferred_assessment_date: preferredDate ? preferredDate.toISOString() : null,
        alternative_date: alternativeDate.trim() || null,
        preferred_times: preferredTimes,
        notes: notes.trim() || null,
        photos: photoUrls,
      };
      
      const { data, error } = await supabase.functions.invoke('public-request-submit', {
        body: requestData
      });
        
      if (error) {
        console.error("Error submitting request:", error);
        toast.error(`Failed to submit request: ${error.message || 'Unknown error'}`);
        return;
      }
      
      // Set business data from response
      if (data?.business) {
        setBusiness(data.business);
      }
      
      setSuccess(true);
      toast.success("Request submitted successfully! We'll get back to you soon.");
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Request Submitted!</h1>
            <p className="text-muted-foreground mb-4">
              Thank you for your request. {business?.name ? `${business.name} will` : 'The business will'} review it and get back to you soon.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Request Service</h1>
          <p className="text-muted-foreground">
            Submit your service request below
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Service Request Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Name</Label>
                    <Input
                      id="customer_name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your full name (optional)"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Email *</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone</Label>
                    <Input
                      id="customer_phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customer_address">Address</Label>
                    <Input
                      id="customer_address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Your address"
                    />
                  </div>
                </div>
              </div>

              {/* Service Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Service Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Request Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief description of what you need"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property_address">Property Address</Label>
                  <Input
                    id="property_address"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="Address where service is needed (if different from above)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_details">Service Details *</Label>
                  <Textarea
                    id="service_details"
                    value={serviceDetails}
                    onChange={(e) => setServiceDetails(e.target.value)}
                    placeholder="Please provide detailed information about the work you need done"
                    rows={4}
                    required
                  />
                </div>
              </div>

              {/* Scheduling */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preferred Scheduling</h3>
                
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

                <div className="space-y-2">
                  <Label htmlFor="alternative_date">Alternative Date/Time</Label>
                  <Input
                    id="alternative_date"
                    value={alternativeDate}
                    onChange={(e) => setAlternativeDate(e.target.value)}
                    placeholder="Any alternative dates or times that work for you"
                  />
                </div>

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

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information or special requests"
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || uploading}
              >
                {uploading ? "Uploading photos..." : loading ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}