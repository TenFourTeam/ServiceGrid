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
import type { Customer } from "@/types";

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
  
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    address: "",
    phone: "",
  });

  const [validationErrors, setValidationErrors] = useState<ValidationState>({
    email: false,
    name: false,
  });

  // Update form data when customer prop changes
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        address: customer.address || "",
        phone: customer.phone || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        address: "",
        phone: "",
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
        notes: null, // Add notes field to match database schema
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
          </div>
        </div>
        
        <DrawerFooter>
          {mode === 'view' ? (
            isMobile ? (
              <div className="flex flex-col gap-2">
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
              <div className="flex justify-end">
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