import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, User, ArrowLeft, Search, Check, Briefcase, FileText, Receipt } from 'lucide-react';
import { usePortalCustomers, PortalCustomer } from '@/hooks/usePortalCustomers';
import { useCustomerEntities, CustomerJob, CustomerQuote, CustomerInvoice } from '@/hooks/useCustomerEntities';
import { cn } from '@/lib/utils';

type ConversationType = 'team' | 'customer';
type Step = 'type' | 'details';

interface EntityReference {
  type: 'job' | 'quote' | 'invoice';
  id: string;
  title: string;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTeamConversation: (title: string) => void;
  onCreateCustomerConversation: (customerId: string, customerName: string, initialReference?: EntityReference) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onCreateTeamConversation,
  onCreateCustomerConversation,
}: NewConversationDialogProps) {
  const [step, setStep] = useState<Step>('type');
  const [conversationType, setConversationType] = useState<ConversationType | null>(null);
  const [title, setTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<PortalCustomer | null>(null);
  const [selectedReference, setSelectedReference] = useState<EntityReference | null>(null);
  
  const { data: portalCustomers = [], isLoading: customersLoading } = usePortalCustomers();
  const { jobs, quotes, invoices, isLoading: entitiesLoading } = useCustomerEntities(selectedCustomer?.id || null);

  const filteredCustomers = portalCustomers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReset = () => {
    setStep('type');
    setConversationType(null);
    setTitle('');
    setSearchQuery('');
    setSelectedCustomer(null);
    setSelectedReference(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) handleReset();
    onOpenChange(open);
  };

  const handleSelectType = (type: ConversationType) => {
    setConversationType(type);
    setStep('details');
  };

  const handleBack = () => {
    if (selectedCustomer) {
      setSelectedCustomer(null);
      setSelectedReference(null);
    } else {
      setStep('type');
      setConversationType(null);
    }
  };

  const handleSelectCustomer = (customer: PortalCustomer) => {
    setSelectedCustomer(customer);
    setSearchQuery('');
  };

  const handleCreate = () => {
    if (conversationType === 'team') {
      if (title.trim()) {
        onCreateTeamConversation(title.trim());
        handleClose(false);
      }
    } else if (conversationType === 'customer' && selectedCustomer) {
      onCreateCustomerConversation(selectedCustomer.id, selectedCustomer.name, selectedReference || undefined);
      handleClose(false);
    }
  };

  const canCreate = conversationType === 'team' 
    ? title.trim().length > 0 
    : selectedCustomer !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === 'details' && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === 'type' && 'Start a Conversation'}
                {step === 'details' && conversationType === 'team' && 'Team Conversation'}
                {step === 'details' && conversationType === 'customer' && (
                  selectedCustomer ? `Chat with ${selectedCustomer.name}` : 'Select Customer'
                )}
              </DialogTitle>
              <DialogDescription>
                {step === 'type' && 'Choose who you want to message'}
                {step === 'details' && conversationType === 'team' && 'Start a conversation with your team'}
                {step === 'details' && conversationType === 'customer' && !selectedCustomer && 'Select a customer with portal access'}
                {step === 'details' && conversationType === 'customer' && selectedCustomer && 'Optionally reference a work order, quote, or invoice'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Type Selection */}
        {step === 'type' && (
          <div className="grid gap-3 py-4">
            <button
              onClick={() => handleSelectType('team')}
              className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Team Conversation</div>
                <div className="text-sm text-muted-foreground">Chat with your team members</div>
              </div>
            </button>
            <button
              onClick={() => handleSelectType('customer')}
              className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">Customer Chat</div>
                <div className="text-sm text-muted-foreground">Message a customer with portal access</div>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Team Details */}
        {step === 'details' && conversationType === 'team' && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Conversation Title</Label>
              <Input
                id="title"
                placeholder="e.g., Project Updates, Team Coordination..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && title.trim()) {
                    handleCreate();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Step 2: Customer Selection */}
        {step === 'details' && conversationType === 'customer' && !selectedCustomer && (
          <div className="py-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <ScrollArea className="h-[280px]">
              {customersLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading customers...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No customers with portal access</p>
                  <p className="text-xs mt-1">Invite customers to the portal first</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-sm">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{customer.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{customer.email}</div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">Portal Active</Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Step 3: Entity Reference Selection (Optional) */}
        {step === 'details' && conversationType === 'customer' && selectedCustomer && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Link this conversation to a work order, quote, or invoice (optional)
            </p>
            <ScrollArea className="h-[280px]">
              {entitiesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-4">
                  {/* Jobs Section */}
                  {jobs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <Briefcase className="h-3.5 w-3.5" />
                        Work Orders
                      </div>
                      <div className="space-y-1">
                        {jobs.slice(0, 5).map((job) => (
                          <EntityItem
                            key={job.id}
                            type="job"
                            id={job.id}
                            title={job.title}
                            subtitle={job.status}
                            selected={selectedReference?.id === job.id}
                            onSelect={(ref) => setSelectedReference(ref?.id === selectedReference?.id ? null : ref)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quotes Section */}
                  {quotes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <FileText className="h-3.5 w-3.5" />
                        Quotes
                      </div>
                      <div className="space-y-1">
                        {quotes.slice(0, 5).map((quote) => (
                          <EntityItem
                            key={quote.id}
                            type="quote"
                            id={quote.id}
                            title={quote.number}
                            subtitle={`$${quote.total.toLocaleString()} • ${quote.status}`}
                            selected={selectedReference?.id === quote.id}
                            onSelect={(ref) => setSelectedReference(ref?.id === selectedReference?.id ? null : ref)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices Section */}
                  {invoices.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <Receipt className="h-3.5 w-3.5" />
                        Invoices
                      </div>
                      <div className="space-y-1">
                        {invoices.slice(0, 5).map((invoice) => (
                          <EntityItem
                            key={invoice.id}
                            type="invoice"
                            id={invoice.id}
                            title={invoice.number}
                            subtitle={`$${invoice.total.toLocaleString()} • ${invoice.status}`}
                            selected={selectedReference?.id === invoice.id}
                            onSelect={(ref) => setSelectedReference(ref?.id === selectedReference?.id ? null : ref)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {jobs.length === 0 && quotes.length === 0 && invoices.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No items to reference for this customer</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          {step === 'details' && (
            <Button onClick={handleCreate} disabled={!canCreate}>
              {conversationType === 'customer' && selectedCustomer ? (
                selectedReference ? 'Start Chat with Reference' : 'Start Chat'
              ) : (
                'Create Conversation'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EntityItemProps {
  type: 'job' | 'quote' | 'invoice';
  id: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onSelect: (ref: EntityReference | null) => void;
}

function EntityItem({ type, id, title, subtitle, selected, onSelect }: EntityItemProps) {
  return (
    <button
      onClick={() => onSelect(selected ? null : { type, id, title })}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left",
        selected ? "bg-primary/10 border border-primary/30" : "hover:bg-accent border border-transparent"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
      </div>
      {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  );
}
