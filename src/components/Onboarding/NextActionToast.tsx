import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowRight, Send, Calendar, Receipt, Users } from 'lucide-react';

interface NextActionConfig {
  title: string;
  description: string;
  actionLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const configs: Record<string, NextActionConfig> = {
  'quote-created': {
    title: 'Quote Created Successfully!',
    description: 'Ready to send it to your customer?',
    actionLabel: 'Send Quote',
    icon: Send,
  },
  'job-created': {
    title: 'Job Scheduled!',
    description: 'Want to create a quote for this job?',
    actionLabel: 'Create Quote',
    icon: Receipt,
  },
  'customer-added': {
    title: 'Customer Added!',
    description: 'Ready to create their first quote?',
    actionLabel: 'Create Quote',
    icon: Receipt,
  },
  'quote-sent': {
    title: 'Quote Sent!',
    description: 'Schedule the job when customer approves?',
    actionLabel: 'View Calendar',
    icon: Calendar,
  },
  'job-completed': {
    title: 'Job Completed!',
    description: 'Ready to send the invoice?',
    actionLabel: 'Create Invoice',
    icon: Receipt,
  },
};

export function showNextActionToast(
  type: keyof typeof configs,
  itemName: string = '',
  onActionClick: () => void
) {
  const config = configs[type];
  if (!config) return;

  const { title, description, actionLabel, icon: Icon } = config;
  const displayDescription = itemName 
    ? description.replace(/your customer|this job|their first quote/, `"${itemName}"`)
    : description;

  toast.success(title, {
    description: displayDescription,
    duration: 8000,
    action: (
      <Button 
        size="sm" 
        onClick={onActionClick}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Icon className="h-3 w-3 mr-1" />
        {actionLabel}
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    ),
  });
}

export function showCrossPollination(
  fromType: 'quote' | 'job' | 'customer',
  itemName: string,
  onCreateQuote?: () => void,
  onCreateJob?: () => void,
  onSendQuote?: () => void
) {
  if (fromType === 'customer' && onCreateQuote) {
    showNextActionToast('customer-added', itemName, onCreateQuote);
  } else if (fromType === 'job' && onCreateQuote) {
    showNextActionToast('job-created', itemName, onCreateQuote);
  } else if (fromType === 'quote' && onSendQuote) {
    showNextActionToast('quote-created', itemName, onSendQuote);
  }
}