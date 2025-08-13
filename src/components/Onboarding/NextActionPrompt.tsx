import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowRight, Send, Calendar, Receipt } from 'lucide-react';

interface NextActionPromptProps {
  type: 'quote-created' | 'job-created' | 'customer-added';
  itemName?: string;
  onActionClick: () => void;
  actionLabel: string;
}

export function showNextActionPrompt(
  type: NextActionPromptProps['type'], 
  itemName: string = '',
  onActionClick: () => void
) {
  const config = {
    'quote-created': {
      title: 'Quote Created Successfully!',
      description: `Ready to send "${itemName}" to your customer?`,
      actionLabel: 'Send Quote',
      icon: Send,
    },
    'job-created': {
      title: 'Job Scheduled!',
      description: `Want to send a quote for "${itemName}"?`,
      actionLabel: 'Create Quote',
      icon: Receipt,
    },
    'customer-added': {
      title: 'Customer Added!',
      description: `Ready to create a quote for ${itemName}?`,
      actionLabel: 'Create Quote',
      icon: Receipt,
    },
  };

  const { title, description, actionLabel, icon: Icon } = config[type];

  toast.success(title, {
    description,
    duration: 6000,
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

export function NextActionPrompt(props: NextActionPromptProps) {
  // This component is used for the toast action button
  return null;
}