import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import type { Customer } from "@/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { getClerkTokenStrict } from "@/utils/clerkToken";

interface CustomerComboboxProps {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomerCombobox({ customers, value, onChange, placeholder = "Select customer…", disabled }: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ id: string; name: string } | null>(null);
  const selected = customers.find((c) => c.id === value);
  const displayName = useMemo(() => selected?.name || (lastCreated && lastCreated.id === value ? lastCreated.name : placeholder), [selected, lastCreated, value, placeholder]);
  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  async function createCustomer() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const token = await getClerkTokenStrict(getToken);
      const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null, address: address.trim() || null }),
      });
      if (!res.ok) throw new Error(`Failed to create customer (${res.status})`);
      const data = await res.json();
      const newId = data?.customer?.id || data?.id || data?.customer_id;
      const newName = data?.customer?.name || name.trim();
      if (newId) {
        setLastCreated({ id: newId, name: newName });
        onChange(newId);
        setOpen(false);
        setCreateOpen(false);
        setName(""); setEmail(""); setAddress("");
        queryClient.invalidateQueries({ queryKey: ["supabase", "customers"] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 opacity-60" />
            {selected ? selected.name : displayName}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50" align="start">
        <Command>
          <CommandInput placeholder="Search customer…" />
          <CommandList className="max-h-64 overflow-auto">
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__create_new__" onSelect={() => setCreateOpen(true)} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                <span>Create new customer</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.name}
                  onSelect={() => {
                    onChange(customer.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === customer.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{customer.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="new-customer-name" className="text-sm">Name *</label>
              <Input id="new-customer-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <label htmlFor="new-customer-email" className="text-sm">Email</label>
              <Input id="new-customer-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </div>
            <div className="space-y-1">
              <label htmlFor="new-customer-address" className="text-sm">Address</label>
              <Input id="new-customer-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="button" onClick={createCustomer} disabled={!name.trim() || creating}>{creating ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Popover>
  );
}
