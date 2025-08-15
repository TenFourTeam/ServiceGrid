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
}

export function CustomerCombobox({ customers, value, onChange, placeholder = "Select customer…", disabled }: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = customers.find((c) => c.id === value);
  const displayName = useMemo(() => selected?.name || placeholder, [selected, placeholder]);

  const handleCreateCustomer = () => {
    // Open customers page in new tab for customer creation
    window.open('/customers?new=1', '_blank');
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
              <CommandItem value="__create_new__" onSelect={handleCreateCustomer} className="cursor-pointer">
                <ExternalLink className="mr-2 h-4 w-4" />
                <span>Add new customer</span>
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
    </Popover>
  );
}
