import { AlertTriangle, ShieldAlert, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    gradient: 'from-blue-500/5 via-blue-500/3 to-transparent',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-500/20',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-600 dark:text-blue-400',
    label: 'Low Risk',
  },
  medium: {
    icon: AlertTriangle,
    gradient: 'from-amber-500/5 via-amber-500/3 to-transparent',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    borderColor: 'border-amber-500/20',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-600 dark:text-amber-400',
    label: 'Medium Risk',
  },
  high: {
    icon: ShieldAlert,
    gradient: 'from-destructive/5 via-destructive/3 to-transparent',
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    borderColor: 'border-destructive/20',
    badgeBg: 'bg-destructive/10',
    badgeText: 'text-destructive',
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
  const [submittingAction, setSubmittingAction] = useState<'confirm' | 'cancel' | null>(null);
  const config = riskConfig[riskLevel];
  const Icon = config.icon;

  const handleConfirm = async () => {
    if (disabled || isSubmitting) return;
    setIsSubmitting(true);
    setSubmittingAction('confirm');
    await onConfirm();
    setIsSubmitting(false);
    setSubmittingAction(null);
  };

  const handleCancel = async () => {
    if (disabled || isSubmitting) return;
    setIsSubmitting(true);
    setSubmittingAction('cancel');
    await onCancel();
    setIsSubmitting(false);
    setSubmittingAction(null);
  };

  return (
    <Card className={cn(
      "overflow-hidden",
      config.borderColor,
      `bg-gradient-to-br ${config.gradient}`
    )}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("p-2 rounded-lg flex-shrink-0", config.iconBg)}>
              <Icon className={cn("w-4 h-4", config.iconColor)} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {action}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          <span className={cn(
            "text-[10px] font-medium px-2 py-1 rounded-full uppercase tracking-wide flex-shrink-0",
            config.badgeBg,
            config.badgeText
          )}>
            {config.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={disabled || isSubmitting}
            className={cn(
              "text-xs h-8 px-3",
              "hover:bg-background/80",
              "transition-all duration-200"
            )}
          >
            {isSubmitting && submittingAction === 'cancel' ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Canceling...
              </>
            ) : (
              cancelLabel
            )}
          </Button>
          <Button
            variant={riskLevel === 'high' ? 'destructive' : 'default'}
            size="sm"
            onClick={handleConfirm}
            disabled={disabled || isSubmitting}
            className={cn(
              "text-xs h-8 px-4",
              "transition-all duration-200",
              riskLevel !== 'high' && "shadow-sm hover:shadow-md"
            )}
          >
            {isSubmitting && submittingAction === 'confirm' ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
