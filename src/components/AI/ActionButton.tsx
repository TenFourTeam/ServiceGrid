import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsPhone } from '@/hooks/use-phone';
import { toast } from 'sonner';

interface ActionButtonProps {
  action: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onExecute: (action: string) => Promise<void>;
  className?: string;
}

export function ActionButton({ 
  action, 
  label, 
  variant = 'primary',
  onExecute,
  className 
}: ActionButtonProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const isPhone = useIsPhone();

  const handleClick = async () => {
    if (isExecuting || isComplete) return;
    
    setIsExecuting(true);
    try {
      await onExecute(action);
      setIsComplete(true);
      toast.success('Action completed');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setIsComplete(false);
      }, 3000);
    } catch (error) {
      console.error('Action execution failed:', error);
      toast.error('Action failed', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getVariantClasses = () => {
    if (isComplete) {
      return 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20 hover:bg-green-500/20';
    }
    
    switch (variant) {
      case 'primary':
        return 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20';
      case 'secondary':
        return 'bg-muted text-foreground border-border hover:bg-muted/80';
      case 'danger':
        return 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20';
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isExecuting || isComplete}
      onClick={handleClick}
      className={cn(
        'text-xs font-medium border transition-all',
        'min-h-[44px]',
        isPhone ? 'h-11 px-4' : 'h-8 px-3',
        getVariantClasses(),
        isComplete && 'pointer-events-none',
        className
      )}
    >
      {isExecuting && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
      {isComplete && <CheckCircle2 className="w-3 h-3 mr-1.5" />}
      {isComplete ? 'Done' : label}
    </Button>
  );
}
