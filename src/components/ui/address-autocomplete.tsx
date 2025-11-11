import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (placeId: string, description: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Address input with Google Places Autocomplete suggestions
 * Features:
 * - Real-time address suggestions as you type
 * - Debounced API calls (500ms) to optimize performance
 * - Keyboard navigation support
 * - Loading and error states
 */
export const AddressAutocomplete = React.forwardRef<
  HTMLInputElement,
  AddressAutocompleteProps
>(({ value, onChange, onPlaceSelect, placeholder, disabled, className, id }, ref) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const debouncedInput = useDebouncedValue(inputValue, 500);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { predictions, isLoading, error, fetchPredictions, clearPredictions } = 
    usePlacesAutocomplete();

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch predictions when debounced input changes
  useEffect(() => {
    if (debouncedInput && debouncedInput.length >= 3) {
      fetchPredictions(debouncedInput);
      setOpen(true);
    } else {
      clearPredictions();
      setOpen(false);
    }
  }, [debouncedInput, fetchPredictions, clearPredictions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectPrediction = (prediction: any) => {
    const description = prediction.description;
    setInputValue(description);
    onChange(description);
    setOpen(false);
    clearPredictions();
    
    if (onPlaceSelect) {
      onPlaceSelect(prediction.place_id, description);
    }

    console.log('[AddressAutocomplete] Selected:', description);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={ref || inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-8", className)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && inputValue && (
          <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
      </div>
      
      {open && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
          <Command>
            <CommandList>
              {predictions.length === 0 && !isLoading && (
                <CommandEmpty>No addresses found</CommandEmpty>
              )}
              {predictions.length > 0 && (
                <CommandGroup>
                  {predictions.map((prediction) => (
                    <CommandItem
                      key={prediction.place_id}
                      value={prediction.description}
                      onSelect={() => handleSelectPrediction(prediction)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {prediction.structured_formatting.main_text}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {prediction.structured_formatting.secondary_text}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
      
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
});

AddressAutocomplete.displayName = "AddressAutocomplete";
