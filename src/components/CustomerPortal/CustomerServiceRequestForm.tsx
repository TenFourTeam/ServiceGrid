import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Loader2, Send, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCustomerServiceRequest } from '@/hooks/useCustomerServiceRequest';
import { useCustomerJobData } from '@/hooks/useCustomerJobData';

const SERVICE_TYPES = [
  'General Maintenance',
  'Repair',
  'New Installation',
  'Inspection',
  'Cleaning',
  'Consultation',
  'Other',
];

const TIME_SLOTS = [
  'Morning (8am - 12pm)',
  'Afternoon (12pm - 5pm)',
  'Evening (5pm - 8pm)',
  'Flexible',
];

export function CustomerServiceRequestForm() {
  const { submitRequest, isSubmitting } = useCustomerServiceRequest();
  const { data: jobData } = useCustomerJobData();
  const [submitted, setSubmitted] = useState(false);
  
  const [serviceType, setServiceType] = useState('');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState<Date | undefined>();
  const [preferredTime, setPreferredTime] = useState('');
  const [address, setAddress] = useState(jobData?.customer?.address || '');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await submitRequest.mutateAsync({
      serviceType,
      description,
      preferredDate: preferredDate ? format(preferredDate, 'yyyy-MM-dd') : undefined,
      preferredTime,
      address,
      urgency,
    });

    setSubmitted(true);
  };

  const handleNewRequest = () => {
    setServiceType('');
    setDescription('');
    setPreferredDate(undefined);
    setPreferredTime('');
    setAddress(jobData?.customer?.address || '');
    setUrgency('normal');
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Request Submitted!</h3>
          <p className="text-muted-foreground mb-6">
            Your service request has been submitted successfully. 
            We'll review it and get back to you soon.
          </p>
          <Button onClick={handleNewRequest} variant="outline">
            Submit Another Request
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a Service</CardTitle>
        <CardDescription>
          Fill out the form below to request a new service. We'll get back to you as soon as possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="service-type">Type of Service *</Label>
            <Select value={serviceType} onValueChange={setServiceType} required>
              <SelectTrigger id="service-type">
                <SelectValue placeholder="Select a service type" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Please describe what you need help with..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label>Urgency</Label>
            <RadioGroup
              value={urgency}
              onValueChange={(value) => setUrgency(value as 'normal' | 'urgent')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="font-normal cursor-pointer">
                  Normal - Schedule at your convenience
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="font-normal cursor-pointer text-destructive">
                  Urgent - Need service ASAP
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preferred Date */}
          <div className="space-y-2">
            <Label>Preferred Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !preferredDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {preferredDate ? format(preferredDate, 'PPP') : 'Pick a date'}
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

          {/* Preferred Time */}
          <div className="space-y-2">
            <Label htmlFor="preferred-time">Preferred Time (optional)</Label>
            <Select value={preferredTime} onValueChange={setPreferredTime}>
              <SelectTrigger id="preferred-time">
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Service Address</Label>
            <Input
              id="address"
              placeholder="Address for the service"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use your address on file
            </p>
          </div>

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting || !serviceType || !description} className="w-full">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
