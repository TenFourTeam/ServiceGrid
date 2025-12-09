import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { invalidationHelpers } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuth } from '@clerk/clerk-react';
import { useAuthApi } from "@/hooks/useAuthApi";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCustomerPortalInvite } from "@/hooks/useCustomerPortalInvite";
import type { Customer } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Send, Loader2 } from 'lucide-react';

// Email validation regex - requires a valid email format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CustomerBottomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  mode?: 'create' | 'edit' | 'view';
  onSave?: () => void;
  onCustomerCreated?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

// Form data interface for internal component state
interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  preferredDays: number[];
  avoidDays: number[];
  preferredTimeStart: string;
  preferredTimeEnd: string;
  schedulingNotes: string;
}

// Validation state interface
interface ValidationState {
  email: boolean;
  name: boolean;
}


export function CustomerBottomModal({ 
  open, 
  onOpenChange, 
  customer,
  mode = 'create',
  onSave,
  onCustomerCreated,
  onEdit,
  onDelete
}: CustomerBottomModalProps) {
  const queryClient = useQueryClient();
  const { businessId, userId } = useBusinessContext();
  const authApi = useAuthApi();
  const isMobile = useIsMobile();
  const { sendInvite, isLoading: isInviteLoading } = useCustomerPortalInvite();
  
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    address: "",
    phone: "",
    preferredDays: [],
    avoidDays: [],
    preferredTimeStart: "",
    preferredTimeEnd: "",
    schedulingNotes: "",
  });

  const [validationErrors, setValidationErrors] = useState<ValidationState>({
    email: false,
    name: false,
  });

  // Update form data when customer prop changes
  useEffect(() => {
    if (customer) {
      const prefs = customer.preferred_days ? JSON.parse(customer.preferred_days as any) : [];
      const avoid = customer.avoid_days ? JSON.parse(customer.avoid_days as any) : [];
      const timeWindow = customer.preferred_time_window ? JSON.parse(customer.preferred_time_window as any) : {};
      
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        address: customer.address || "",
        phone: customer.phone || "",
        preferredDays: prefs,
        avoidDays: avoid,
        preferredTimeStart: timeWindow.start || "",
        preferredTimeEnd: timeWindow.end || "",
        schedulingNotes: customer.scheduling_notes || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        address: "",
        phone: "",
        preferredDays: [],
        avoidDays: [],
        preferredTimeStart: "",
        preferredTimeEnd: "",
        schedulingNotes: "",
      });
    }
  }, [customer]);

  const [loading, setLoading] = useState(false);

  // Validation helper functions
  const validateEmail = (email: string): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return false;
    
    // More comprehensive email validation
    return EMAIL_REGEX.test(trimmedEmail) && 
           trimmedEmail.includes('.') && 
           trimmedEmail.split('@').length === 2 &&
           trimmedEmail.split('@')[1].includes('.');
  };

  const validateName = (name: string): boolean => {
    return name.trim().length >= 2;
  };

  const handleEdit = () => {
    onEdit?.(customer);
  };

  const handleDelete = () => {
    onDelete?.(customer);
  };

  const handleSendPortalInvite = () => {
    if (!customer?.id || !businessId) return;
    sendInvite({ customerId: customer.id, businessId });
  };

  const handleSave = async () => {
    const nameValid = validateName(formData.name);
    const emailValid = validateEmail(formData.email);
    
    setValidationErrors({
      name: !nameValid,
      email: !emailValid,
    });

    if (!nameValid || !emailValid) {
      // Show toast for each validation error
      if (!nameValid) {
        toast.error("Name must be at least 2 characters long");
      }
      if (!emailValid && formData.email.trim()) {
        toast.error("Please enter a valid email address (e.g., user@example.com)");
      } else if (!emailValid) {
        toast.error("Email is required");
      }
      return;
    }

    if (!businessId || !userId) {
      toast.error("Authentication context missing");
      return;
    }

    setLoading(true);
    try {
      const isEdit = !!customer?.id;
      const customerData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: null,
        preferred_days: formData.preferredDays.length > 0 ? JSON.stringify(formData.preferredDays) : null,
        avoid_days: formData.avoidDays.length > 0 ? JSON.stringify(formData.avoidDays) : null,
        preferred_time_window: formData.preferredTimeStart && formData.preferredTimeEnd 
          ? JSON.stringify({ start: formData.preferredTimeStart, end: formData.preferredTimeEnd })
          : null,
        scheduling_notes: formData.schedulingNotes.trim() || null,
      };
      
      
      if (isEdit) {
        const updatePayload = {
          id: customer.id,
          ...customerData
        };
        
        const { data, error } = await authApi.invoke('customers-crud', {
          method: 'PUT',
          body: updatePayload
        });
          
        if (error) {
          console.error("Error updating customer:", error);
          toast.error(`Failed to update customer: ${error.message || 'Unknown error'}`);
          return;
        }
        
        toast.success("Customer updated successfully");
      } else {
        const { data, error } = await authApi.invoke('customers-crud', {
          method: 'POST',
          body: customerData
        });
          
        if (error) {
          console.error("Error creating customer:", error);
          // Show more specific error messages based on backend response
          if (error.message && error.message.includes('invalid email format')) {
            toast.error("Please enter a valid email address (e.g., user@example.com)");
          } else if (error.message && error.message.includes('already exists')) {
            toast.error("A customer with this email already exists");
          } else {
            toast.error(`Failed to create customer: ${error.message || 'Unknown error'}`);
          }
          return;
        }
        
        toast.success("Customer created successfully");
        
        // Call the onCustomerCreated callback with the new customer data
        if (onCustomerCreated && data?.customer) {
          onCustomerCreated(data.customer);
        }
      }
      
      if (businessId) {
        invalidationHelpers.customers(queryClient, businessId);
      }
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({
        name: "",
        email: "",
        address: "",
        phone: "",
        preferredDays: [],
        avoidDays: [],
        preferredTimeStart: "",
        preferredTimeEnd: "",
        schedulingNotes: "",
      });
      setValidationErrors({
        name: false,
        email: false,
      });
    }
    onOpenChange(newOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>
            {mode === 'view' ? 'Customer Details' : (customer?.id ? "Edit Customer" : "New Customer")}
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name {mode !== 'view' && '*'}</Label>
              {mode === 'view' ? (
                <div className="p-2 bg-muted/50 rounded-md">{formData.name || 'N/A'}</div>
              ) : (
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (validationErrors.name && validateName(e.target.value)) {
                      setValidationErrors({ ...validationErrors, name: false });
                    }
                  }}
                  placeholder="Customer name"
                  required
                  className={validationErrors.name ? "border-destructive" : ""}
                />
              )}
              {validationErrors.name && mode !== 'view' && (
                <p className="text-sm text-destructive">Name must be at least 2 characters long</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email {mode !== 'view' && '*'}</Label>
              {mode === 'view' ? (
                <div className="p-2 bg-muted/50 rounded-md">{formData.email || 'N/A'}</div>
              ) : (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (validationErrors.email && validateEmail(e.target.value)) {
                      setValidationErrors({ ...validationErrors, email: false });
                    }
                  }}
                  placeholder="customer@example.com"
                  required
                  className={validationErrors.email ? "border-destructive" : ""}
                />
              )}
              {validationErrors.email && mode !== 'view' && (
                <p className="text-sm text-destructive">Please enter a valid email address (e.g., user@example.com)</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              {mode === 'view' ? (
                <div className="p-2 bg-muted/50 rounded-md">{formData.phone || 'N/A'}</div>
              ) : (
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              {mode === 'view' ? (
                <div className="p-2 bg-muted/50 rounded-md">{formData.address || 'N/A'}</div>
              ) : (
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, City, State 12345"
                />
              )}
            </div>

            {/* Scheduling Preferences */}
            {mode !== 'view' && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded px-2">
                  <Label>Scheduling Preferences (Optional)</Label>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Preferred Days</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.preferredDays.includes(idx)}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...formData.preferredDays, idx]
                                : formData.preferredDays.filter(d => d !== idx);
                              setFormData({ ...formData, preferredDays: updated });
                            }}
                          />
                          <Label className="text-sm font-normal">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Preferred Time Window</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="time"
                        value={formData.preferredTimeStart}
                        onChange={(e) => setFormData({ ...formData, preferredTimeStart: e.target.value })}
                        placeholder="Start"
                      />
                      <Input
                        type="time"
                        value={formData.preferredTimeEnd}
                        onChange={(e) => setFormData({ ...formData, preferredTimeEnd: e.target.value })}
                        placeholder="End"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Days to Avoid</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.avoidDays.includes(idx)}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...formData.avoidDays, idx]
                                : formData.avoidDays.filter(d => d !== idx);
                              setFormData({ ...formData, avoidDays: updated });
                            }}
                          />
                          <Label className="text-sm font-normal">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Scheduling Notes</Label>
                    <Textarea
                      value={formData.schedulingNotes}
                      onChange={(e) => setFormData({ ...formData, schedulingNotes: e.target.value })}
                      placeholder="Any special scheduling considerations..."
                      rows={2}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
        
        <DrawerFooter>
          {mode === 'view' ? (
            isMobile ? (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={handleSendPortalInvite}
                  disabled={isInviteLoading}
                  className="w-full"
                >
                  {isInviteLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Invite to Portal
                </Button>
                <Button
                  variant="default"
                  onClick={handleEdit}
                  className="w-full"
                >
                  Edit Customer
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="w-full"
                >
                  Delete Customer
                </Button>
              </div>
            ) : (
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleSendPortalInvite}
                  disabled={isInviteLoading}
                >
                  {isInviteLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Invite to Portal
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={handleEdit}
                  >
                    Edit Customer
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Delete Customer
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className={isMobile ? "flex flex-col gap-2" : "flex gap-2"}>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
                className={isMobile ? "w-full" : "flex-1"}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className={isMobile ? "w-full" : "flex-1"}
              >
                {customer?.id ? "Update" : "Create"} Customer
              </Button>
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}