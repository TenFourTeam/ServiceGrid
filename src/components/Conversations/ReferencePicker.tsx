import { useEffect, useState, useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
  const { jobs, quotes, invoices, isLoading } = useCustomerEntities(customerId ?? null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const allItems: EntityReference[] = [
    ...jobs.map(j => ({ type: 'job' as const, id: j.id, title: j.title || 'Untitled Job' })),
    ...quotes.map(q => ({ type: 'quote' as const, id: q.id, title: q.number })),
    ...invoices.map(i => ({ type: 'invoice' as const, id: i.id, title: i.number })),
  ];

  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(0);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && allItems[selectedIndex]) {
        e.preventDefault();
        onSelect(allItems[selectedIndex]);
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allItems, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const selectedEl = containerRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen || !anchorRect) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'job': return <Briefcase className="h-4 w-4 text-primary" />;
      case 'quote': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'invoice': return <Receipt className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          left: Math.min(anchorRect.left, window.innerWidth - 300),
          top: Math.max(anchorRect.top - 280, 8),
          zIndex: 50,
        }}
        className="w-72 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
      >
        <Command className="border-0">
          <CommandInput placeholder="Search references..." className="border-b" />
          <CommandList className="max-h-64">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : allItems.length === 0 ? (
              <CommandEmpty>No items found</CommandEmpty>
            ) : (
              <>
                {jobs.length > 0 && (
                  <CommandGroup heading="Work Orders">
                    {jobs.map((job, idx) => (
                      <CommandItem
                        key={job.id}
                        data-index={idx}
                        onSelect={() => {
                          onSelect({ type: 'job', id: job.id, title: job.title || 'Untitled Job' });
                          onClose();
                        }}
                        className={selectedIndex === idx ? 'bg-accent' : ''}
                      >
                        {getIcon('job')}
                        <span className="ml-2 truncate">{job.title || 'Untitled Job'}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {quotes.length > 0 && (
                  <CommandGroup heading="Quotes">
                    {quotes.map((quote, idx) => {
                      const globalIdx = jobs.length + idx;
                      return (
                        <CommandItem
                          key={quote.id}
                          data-index={globalIdx}
                          onSelect={() => {
                            onSelect({ type: 'quote', id: quote.id, title: quote.number });
                            onClose();
                          }}
                          className={selectedIndex === globalIdx ? 'bg-accent' : ''}
                        >
                          {getIcon('quote')}
                          <span className="ml-2 truncate">{quote.number}</span>
                          {quote.total && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              ${quote.total.toFixed(2)}
                            </span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
                {invoices.length > 0 && (
                  <CommandGroup heading="Invoices">
                    {invoices.map((invoice, idx) => {
                      const globalIdx = jobs.length + quotes.length + idx;
                      return (
                        <CommandItem
                          key={invoice.id}
                          data-index={globalIdx}
                          onSelect={() => {
                            onSelect({ type: 'invoice', id: invoice.id, title: invoice.number });
                            onClose();
                          }}
                          className={selectedIndex === globalIdx ? 'bg-accent' : ''}
                        >
                          {getIcon('invoice')}
                          <span className="ml-2 truncate">{invoice.number}</span>
                          <span className={`ml-auto text-xs ${invoice.status === 'paid' ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {invoice.status}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </div>
    </>
  );
}
