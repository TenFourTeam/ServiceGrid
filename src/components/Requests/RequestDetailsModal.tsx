import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Edit, Save, X, Phone, Mail, MapPin } from "lucide-react";
import { RequestListItem } from "@/hooks/useRequestsData";
import { useRequestOperations } from "@/hooks/useRequestOperations";
import { useCustomersData } from "@/hooks/useCustomersData";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { requestSchema, RequestFormData, preferredTimeOptions, statusOptions } from "@/validation/requests";

interface RequestDetailsModalProps {
  request?: RequestListItem;
  open: boolean;
  onClose: () => void;
}

export function RequestDetailsModal({ request, open, onClose }: RequestDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(!request); // If no request, we're creating
  const { createRequest, updateRequest } = useRequestOperations();
  const { data: customers = [] } = useCustomersData();
  const { userId } = useBusinessContext();

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      customer_id: request?.customer_id || "",
      title: request?.title || "",
      property_address: request?.property_address || "",
      service_details: request?.service_details || "",
      preferred_assessment_date: request?.preferred_assessment_date || "",
      alternative_date: request?.alternative_date || "",
      preferred_times: request?.preferred_times || [],
      status: request?.status || "New",
      notes: request?.notes || "",
    },
  });

  // Reset form when request changes
  useEffect(() => {
    if (request) {
      form.reset({
        customer_id: request.customer_id,
        title: request.title,
        property_address: request.property_address || "",
        service_details: request.service_details,
        preferred_assessment_date: request.preferred_assessment_date || "",
        alternative_date: request.alternative_date || "",
        preferred_times: request.preferred_times || [],
        status: request.status,
        notes: request.notes || "",
      });
      setIsEditing(false);
    } else {
      form.reset({
        customer_id: "",
        title: "",
        property_address: "",
        service_details: "",
        preferred_assessment_date: "",
        alternative_date: "",
        preferred_times: [],
        status: "New",
        notes: "",
      });
      setIsEditing(true);
    }
  }, [request, form]);

  const onSubmit = async (data: RequestFormData) => {
    try {
      if (request) {
        // Update existing request
        await updateRequest.mutateAsync({
          id: request.id,
          ...data,
        });
        setIsEditing(false);
      } else {
        // Create new request
        if (!userId) throw new Error("User not authenticated");
        await createRequest.mutateAsync({
          customer_id: data.customer_id,
          title: data.title,
          property_address: data.property_address,
          service_details: data.service_details,
          preferred_assessment_date: data.preferred_assessment_date,
          alternative_date: data.alternative_date,
          preferred_times: data.preferred_times,
          status: data.status,
          notes: data.notes,
          owner_id: userId,
        });
        onClose();
      }
    } catch (error) {
      console.error('Error saving request:', error);
    }
  };

  const handleCancel = () => {
    if (request) {
      // Reset form to original values
      form.reset({
        customer_id: request.customer_id,
        title: request.title,
        property_address: request.property_address || "",
        service_details: request.service_details,
        preferred_assessment_date: request.preferred_assessment_date || "",
        alternative_date: request.alternative_date || "",
        preferred_times: request.preferred_times || [],
        status: request.status,
        notes: request.notes || "",
      });
      setIsEditing(false);
    } else {
      onClose();
    }
  };

  const selectedCustomer = customers.find(c => c.id === form.watch("customer_id"));
  const selectedDate = form.watch("preferred_assessment_date");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{request ? request.title : "New Request"}</span>
            <div className="flex items-center gap-2">
              {request && !isEditing && (
                <>
                  {statusOptions.find(s => s.value === request.status) && (
                    <Badge className={statusOptions.find(s => s.value === request.status)!.color}>
                      {statusOptions.find(s => s.value === request.status)!.label}
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} - {customer.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : selectedCustomer && (
                  <div className="space-y-2">
                    <h4 className="font-medium">{selectedCustomer.name}</h4>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {selectedCustomer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{selectedCustomer.email}</span>
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{selectedCustomer.phone}</span>
                        </div>
                      )}
                      {selectedCustomer.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{selectedCustomer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Request Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Brief description of the request"
                            disabled={!isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {request && (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!isEditing}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statusOptions.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="property_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Address</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Address where service is needed"
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="service_details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Detailed description of the work requested"
                          rows={4}
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scheduling Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="preferred_assessment_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Preferred Assessment Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={!isEditing}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate ? new Date(selectedDate) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString())}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="alternative_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternative Date</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Alternative date or time preference"
                            disabled={!isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="preferred_times"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Times</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {preferredTimeOptions.map((time) => (
                          <div key={time} className="flex items-center space-x-2">
                            <Checkbox
                              id={time}
                              checked={field.value?.includes(time) || false}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, time]);
                                } else {
                                  field.onChange(current.filter(t => t !== time));
                                }
                              }}
                              disabled={!isEditing}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Internal notes (not visible to customer)"
                          rows={3}
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createRequest.isPending || updateRequest.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {request ? "Update Request" : "Create Request"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}