import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Sparkles } from 'lucide-react';
import { feedback } from '@/utils/feedback';

interface NextProcessSuggestionProps {
  suggestion: {
    processId: string;
    patternId: string;
    reason: string;
    contextToPass: Record<string, any>;
    fromProcess: string;
  };
  onContinue: (prompt: string, context?: Record<string, any>) => void;
}

const PROCESS_LABELS: Record<string, string> = {
  'lead_generation': 'Lead Capture',
  'communication': 'Customer Communication',
  'site_assessment': 'Site Assessment',
  'quoting': 'Quote & Job Creation',
  'scheduling': 'Job Scheduling',
};

const PROCESS_PROMPTS: Record<string, string> = {
  'lead_generation': 'Capture a new lead',
  'communication': 'Contact the customer',
  'site_assessment': 'Schedule a site assessment',
  'quoting': 'Create a quote',
  'scheduling': 'Schedule the job',
};

export function NextProcessSuggestionCard({ suggestion, onContinue }: NextProcessSuggestionProps) {
  const processLabel = PROCESS_LABELS[suggestion.processId] || suggestion.processId;
  const prompt = PROCESS_PROMPTS[suggestion.processId] || `Start ${processLabel}`;

  const handleContinue = () => {
    feedback.tap();
    onContinue(prompt, {
      ...suggestion.contextToPass,
      fromProcess: suggestion.fromProcess,
    });
  };

  return (
    <Card className="mt-3 border-primary/20 bg-primary/5" data-testid="next-process-suggestion">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Suggested next step
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {suggestion.reason}
            </p>
            <Button
              variant="default"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={handleContinue}
            >
              Continue to {processLabel}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
