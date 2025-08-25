import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, ExternalLink, User } from "lucide-react";
import type { Customer } from "@/types";
import { cn } from "@/lib/utils";

interface CustomerComboboxProps {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onCreateCustomer?: () => void;
}

export function CustomerCombobox({ customers, value, onChange, placeholder = "Select customer…", disabled, onCreateCustomer }: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = customers.find((c) => c.id === value);
  const displayName = useMemo(() => selected?.name || placeholder, [selected, placeholder]);

  // Helper to check if multiple customers have the same name
  const getCustomerDisplayName = (customer: Customer) => {
    const duplicateNames = customers.filter(c => c.name === customer.name);
    if (duplicateNames.length > 1) {
      return `${customer.name} (${customer.email})`;
    }
    return customer.name;
  };

  const handleCreateCustomer = () => {
    if (onCreateCustomer) {
      onCreateCustomer();
    } else {
      // Fallback to external navigation for backwards compatibility
      window.open('/customers?new=1', '_blank');
    }
    setOpen(false);
  };

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
            {selected ? getCustomerDisplayName(selected) : displayName}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50" align="start">
        <Command filter={(value, search) => {
          if (value === "__create_new__") return 1;
          const customer = customers.find(c => c.id === value);
          if (!customer) return 0;
          const searchLower = search.toLowerCase();
          return (customer.name.toLowerCase().includes(searchLower) || 
                  customer.email.toLowerCase().includes(searchLower)) ? 1 : 0;
        }}>
          <CommandInput placeholder="Search by name or email…" />
          <CommandList className="max-h-64 overflow-auto">
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__create_new__" onSelect={handleCreateCustomer} className="cursor-pointer">
                <ExternalLink className="mr-2 h-4 w-4" />
                <span>Add new customer</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => {
                    onChange(customer.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === customer.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{getCustomerDisplayName(customer)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
