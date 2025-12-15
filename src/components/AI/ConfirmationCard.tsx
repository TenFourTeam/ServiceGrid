import { AlertTriangle, ShieldAlert, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ConfirmationCardProps {
  action: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

const riskConfig = {
  low: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-500',
    label: 'Low Risk',
  },
  medium: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-500',
    label: 'Medium Risk',
  },
  high: {
    icon: ShieldAlert,
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    iconColor: 'text-destructive',
    label: 'High Risk',
  },
};

export function ConfirmationCard({
  action,
  description,
  riskLevel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  disabled = false,
}: ConfirmationCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const config = riskConfig[riskLevel];
  const Icon = config.icon;

  const handleConfirm = async () => {
    if (disabled || isSubmitting) return;
    setIsSubmitting(true);
    await onConfirm();
    setIsSubmitting(false);
  };

  const handleCancel = async () => {
    if (disabled || isSubmitting) return;
    setIsSubmitting(true);
    await onCancel();
    setIsSubmitting(false);
  };

  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3",
      config.bgColor,
      config.borderColor
    )}>
      {/* Header with Risk Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)} />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{action}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className={cn(
          "text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide",
          riskLevel === 'high' && "bg-destructive/20 text-destructive",
          riskLevel === 'medium' && "bg-amber-500/20 text-amber-600 dark:text-amber-400",
          riskLevel === 'low' && "bg-blue-500/20 text-blue-600 dark:text-blue-400"
        )}>
          {config.label}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={disabled || isSubmitting}
          className="text-xs"
        >
          {cancelLabel}
        </Button>
        <Button
          variant={riskLevel === 'high' ? 'destructive' : 'default'}
          size="sm"
          onClick={handleConfirm}
          disabled={disabled || isSubmitting}
          className="text-xs"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Processing...
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </div>
    </div>
  );
}
