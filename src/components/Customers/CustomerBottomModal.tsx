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
import { createAuthEdgeApi } from "@/utils/authEdgeApi";
import type { Customer } from "@/types";

interface CustomerBottomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSave?: () => void;
}

// Form data interface for internal component state
interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export function CustomerBottomModal({ 
  open, 
  onOpenChange, 
  customer,
  onSave 
}: CustomerBottomModalProps) {
  const queryClient = useQueryClient();
  const { businessId, userId } = useBusinessContext();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    address: "",
    phone: "",
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

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required");
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
        ...(isEdit && { id: customer.id }), // Only include ID for updates
      };
      
      console.log('[CustomerModal] Sending customer data:', customerData);
      console.log('[CustomerModal] Business context:', { businessId, userId });
      console.log('[CustomerModal] Operation:', isEdit ? 'UPDATE' : 'CREATE');
      
      if (isEdit) {
        const { data, error } = await authApi.invoke('customers-crud', {
          method: 'PUT',
          body: {
            id: customer.id,
            ...customerData
          }
        });
          
        if (error) {
          console.error("Error updating customer:", error);
          toast.error("Failed to update customer");
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
          toast.error("Failed to create customer");
          return;
        }
        
        toast.success("Customer created successfully");
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
    }
    onOpenChange(newOpen);
  };

  const FormContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Customer name"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="customer@example.com"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="(555) 123-4567"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="123 Main St, City, State 12345"
        />
      </div>
    </div>
  );

  const ActionButtons = () => (
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
        disabled={loading}
        className="flex-1"
      >
        {customer?.id ? "Update" : "Create"} Customer
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>
            {customer?.id ? "Edit Customer" : "New Customer"}
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-4 overflow-y-auto">
          <FormContent />
        </div>
        
        <DrawerFooter>
          <ActionButtons />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}