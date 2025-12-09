import { useEffect, useState, useRef } from 'react';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { useCustomerEntities } from '@/hooks/useCustomerEntities';
import { Briefcase, FileText, Receipt, Loader2 } from 'lucide-react';

export interface EntityReference {
  type: 'job' | 'quote' | 'invoice';
  id: string;
  title: string;
}

interface ReferencePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (reference: EntityReference) => void;
  customerId?: string | null;
  anchorRect: DOMRect | null;
}

export function ReferencePicker({ isOpen, onClose, onSelect, customerId, anchorRect }: ReferencePickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  const { jobs, quotes, invoices, isLoading } = useCustomerEntities(customerId || null);

  // Create flat list of all items for keyboard navigation
  const allItems: EntityReference[] = [
    ...jobs.slice(0, 5).map(j => ({ type: 'job' as const, id: j.id, title: j.title })),
    ...quotes.slice(0, 5).map(q => ({ type: 'quote' as const, id: q.id, title: q.number })),
    ...invoices.slice(0, 5).map(i => ({ type: 'invoice' as const, id: i.id, title: i.number })),
  ];

  // Reset selected index when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [customerId]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = allItems[selectedIndex];
        if (item) {
          onSelect(item);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, allItems, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    itemsRef.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen || !anchorRect) return null;

  const getIcon = (type: 'job' | 'quote' | 'invoice') => {
    switch (type) {
      case 'job': return <Briefcase className="h-4 w-4 text-muted-foreground" />;
      case 'quote': return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'invoice': return <Receipt className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: 'job' | 'quote' | 'invoice') => {
    switch (type) {
      case 'job': return 'Work Order';
      case 'quote': return 'Quote';
      case 'invoice': return 'Invoice';
    }
  };

  let itemIndex = 0;

  return (
    <div
      style={{
        position: 'fixed',
        left: anchorRect.left,
        top: anchorRect.top - 240,
        zIndex: 100,
      }}
      className="w-72"
    >
      <Popover open={isOpen} onOpenChange={onClose}>
        <PopoverContent 
          className="w-72 p-0" 
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {isLoading && (
                <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              )}
              
              {!isLoading && allItems.length === 0 && (
                <CommandEmpty>
                  {customerId ? 'No items for this customer' : 'Type / to reference items'}
                </CommandEmpty>
              )}

              {!isLoading && jobs.length > 0 && (
                <CommandGroup heading="Work Orders">
                  {jobs.slice(0, 5).map((job) => {
                    const currentIndex = itemIndex++;
                    return (
                      <CommandItem
                        key={job.id}
                        ref={el => itemsRef.current[currentIndex] = el}
                        onSelect={() => onSelect({ type: 'job', id: job.id, title: job.title })}
                        className={selectedIndex === currentIndex ? 'bg-accent' : ''}
                      >
                        <div className="flex items-center gap-2">
                          {getIcon('job')}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{job.title}</span>
                            <span className="text-xs text-muted-foreground capitalize">{job.status}</span>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {!isLoading && quotes.length > 0 && (
                <CommandGroup heading="Quotes">
                  {quotes.slice(0, 5).map((quote) => {
                    const currentIndex = itemIndex++;
                    return (
                      <CommandItem
                        key={quote.id}
                        ref={el => itemsRef.current[currentIndex] = el}
                        onSelect={() => onSelect({ type: 'quote', id: quote.id, title: quote.number })}
                        className={selectedIndex === currentIndex ? 'bg-accent' : ''}
                      >
                        <div className="flex items-center gap-2">
                          {getIcon('quote')}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{quote.number}</span>
                            <span className="text-xs text-muted-foreground">
                              ${quote.total.toLocaleString()} • {quote.status}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {!isLoading && invoices.length > 0 && (
                <CommandGroup heading="Invoices">
                  {invoices.slice(0, 5).map((invoice) => {
                    const currentIndex = itemIndex++;
                    return (
                      <CommandItem
                        key={invoice.id}
                        ref={el => itemsRef.current[currentIndex] = el}
                        onSelect={() => onSelect({ type: 'invoice', id: invoice.id, title: invoice.number })}
                        className={selectedIndex === currentIndex ? 'bg-accent' : ''}
                      >
                        <div className="flex items-center gap-2">
                          {getIcon('invoice')}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{invoice.number}</span>
                            <span className="text-xs text-muted-foreground">
                              ${invoice.total.toLocaleString()} • {invoice.status}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
