import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ClarificationOption {
  label: string;
  value: string;
}

interface ClarificationCardProps {
  question: string;
  options?: ClarificationOption[];
  allowFreeform?: boolean;
  onSelectOption: (value: string) => void;
  disabled?: boolean;
}

export function ClarificationCard({
  question,
  options = [],
  allowFreeform = true,
  onSelectOption,
  disabled = false,
}: ClarificationCardProps) {
  const [freeformValue, setFreeformValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionClick = async (value: string) => {
    if (disabled || isSubmitting) return;
    setIsSubmitting(true);
    await onSelectOption(value);
    setIsSubmitting(false);
  };

  const handleFreeformSubmit = async () => {
    if (!freeformValue.trim() || disabled || isSubmitting) return;
    setIsSubmitting(true);
    await onSelectOption(freeformValue.trim());
    setFreeformValue('');
    setIsSubmitting(false);
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm font-medium text-foreground">{question}</p>
      </div>

      {/* Option Buttons */}
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-7">
          {options.map((option, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => handleOptionClick(option.value)}
              disabled={disabled || isSubmitting}
              className={cn(
                "text-xs transition-all hover:bg-primary hover:text-primary-foreground",
                isSubmitting && "opacity-50"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}

      {/* Freeform Input */}
      {allowFreeform && (
        <div className="flex gap-2 pl-7">
          <Input
            placeholder="Or type your answer..."
            value={freeformValue}
            onChange={(e) => setFreeformValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFreeformSubmit()}
            disabled={disabled || isSubmitting}
            className="text-sm h-8"
          />
          <Button
            size="sm"
            onClick={handleFreeformSubmit}
            disabled={!freeformValue.trim() || disabled || isSubmitting}
            className="h-8"
          >
            Send
          </Button>
        </div>
      )}
    </div>
  );
}
