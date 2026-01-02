import { useState } from 'react';
import { HelpCircle, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionClick = async (value: string) => {
    if (disabled || isSubmitting) return;
    setSelectedOption(value);
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
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent overflow-hidden">
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {question}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Option Buttons */}
        {options.length > 0 && (
          <div className="grid gap-2">
            {options.map((option, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleOptionClick(option.value)}
                disabled={disabled || isSubmitting}
                className={cn(
                  "justify-start h-auto py-2.5 px-3 text-left whitespace-normal",
                  "text-sm font-normal",
                  "border-border/60 bg-background/50 hover:bg-primary/10 hover:border-primary/30",
                  "transition-all duration-200",
                  selectedOption === option.value && isSubmitting && 
                    "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                )}
              >
                <span className={cn(
                  "transition-opacity",
                  isSubmitting && selectedOption === option.value && "opacity-70"
                )}>
                  {option.label}
                </span>
                {isSubmitting && selectedOption === option.value && (
                  <span className="ml-auto w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin flex-shrink-0" />
                )}
              </Button>
            ))}
          </div>
        )}

        {/* Freeform Input */}
        {allowFreeform && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <HelpCircle className="w-3 h-3" />
              <span>Or type something else</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type your response..."
                value={freeformValue}
                onChange={(e) => setFreeformValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFreeformSubmit()}
                disabled={disabled || isSubmitting}
                className={cn(
                  "text-sm h-9 bg-background/50 border-border/60",
                  "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                )}
              />
              <Button
                size="sm"
                onClick={handleFreeformSubmit}
                disabled={!freeformValue.trim() || disabled || isSubmitting}
                className="h-9 px-3 gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="sr-only sm:not-sr-only">Send</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
