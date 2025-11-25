import { useState } from 'react';
import { Sparkles, Check, X, Clock, User, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAIScheduling, ScheduleSuggestion } from '@/hooks/useAIScheduling';
import { Job, BusinessMember } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getJobDisplayName } from '@/utils/jobDisplay';

interface AIScheduleSuggestionsProps {
  unscheduledJobs: Partial<Job>[];
  existingJobs: Job[];
  teamMembers: BusinessMember[];
  businessId: string;
  onSuggestionAccepted?: (suggestion: ScheduleSuggestion, job: Partial<Job>) => void;
  onJobScheduled?: () => void;
}

/**
 * AI-powered scheduling suggestions component
 * Displays optimal time slots for unscheduled jobs
 * Considers priority, location, team availability
 */
export function AIScheduleSuggestions({
  unscheduledJobs,
  existingJobs,
  teamMembers,
  businessId,
  onSuggestionAccepted,
  onJobScheduled
}: AIScheduleSuggestionsProps) {
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const aiScheduling = useAIScheduling();

  const handleGetSuggestions = async () => {
    try {
      console.info('[AIScheduleSuggestions] Requesting suggestions');
      await aiScheduling.mutateAsync({
        businessId,
        unscheduledJobs,
        existingJobs,
        teamMembers
      });
      toast.success('AI generated scheduling suggestions!');
    } catch (error) {
      console.error('[AIScheduleSuggestions] Error:', error);
      toast.error('Failed to generate suggestions. Please try again.');
    }
  };

  const handleAcceptSuggestion = async (suggestion: ScheduleSuggestion, job: Partial<Job>) => {
    try {
      console.info('[AIScheduleSuggestions] Accepting suggestion', { jobId: suggestion.jobId });
      
      if (onSuggestionAccepted) {
        onSuggestionAccepted(suggestion, job);
      }
      
      setAcceptedSuggestions(prev => new Set(prev).add(suggestion.jobId));
      toast.success('Suggestion accepted! Create the job to apply it.');
      onJobScheduled?.();
    } catch (error) {
      console.error('[AIScheduleSuggestions] Error accepting suggestion:', error);
      toast.error('Failed to accept suggestion');
    }
  };

  const handleRejectSuggestion = (jobId: string) => {
    setAcceptedSuggestions(prev => new Set(prev).add(jobId));
  };

  if (unscheduledJobs.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 ai-card border-2 shadow-lg ai-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              AI Scheduling Assistant
            </CardTitle>
            <CardDescription className="text-base">
              {unscheduledJobs.length} job{unscheduledJobs.length !== 1 ? 's' : ''} ready to schedule
            </CardDescription>
          </div>
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            Powered by Gemini 2.5
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!aiScheduling.data ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Let AI analyze your schedule and suggest optimal time slots based on:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Job priority and urgency</li>
              <li>• Geographic proximity (minimize travel)</li>
              <li>• Team availability and workload</li>
              <li>• Customer preferred time windows</li>
            </ul>
            <Button
              onClick={handleGetSuggestions}
              disabled={aiScheduling.isPending}
              className="w-full ai-button text-base h-11"
              size="lg"
            >
              {aiScheduling.isPending ? (
                <>
                  <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing schedule...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Get AI Suggestions
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              ⚡ Takes ~5 seconds • Considers all scheduling constraints
            </p>
          </div>
        ) : aiScheduling.data.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to generate suggestions. Please ensure jobs have addresses and try again.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {aiScheduling.data.length} suggestion{aiScheduling.data.length !== 1 ? 's' : ''} generated
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  aiScheduling.reset();
                  setAcceptedSuggestions(new Set());
                }}
              >
                Get new suggestions
              </Button>
            </div>
            
            {aiScheduling.data.map((suggestion) => {
              const job = unscheduledJobs.find(j => j.id === suggestion.jobId);
              const isAccepted = acceptedSuggestions.has(suggestion.jobId);
              
              if (!job) return null;

              const teamMember = suggestion.assignedMemberId 
                ? teamMembers.find(m => m.user_id === suggestion.assignedMemberId)
                : null;

              return (
                <Card key={suggestion.jobId} className={isAccepted ? 'opacity-50 border-muted' : 'border-purple-100 dark:border-purple-900'}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-medium">{getJobDisplayName(job)}</h4>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(suggestion.recommendedStartTime), 'MMM d, h:mm a')}
                            {' → '}
                            {format(new Date(suggestion.recommendedEndTime), 'h:mm a')}
                          </span>
                          
                          {teamMember && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {teamMember.name || 'Team Member'}
                            </span>
                          )}
                          
                          <Badge variant="outline" className="ml-auto">
                            {Math.round(suggestion.priorityScore * 100)}% match
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                          💡 {suggestion.reasoning}
                        </p>
                      </div>
                      
                      {!isAccepted && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAcceptSuggestion(suggestion, job)}
                            title="Accept suggestion"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRejectSuggestion(suggestion.jobId)}
                            title="Reject suggestion"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {isAccepted && (
                        <Badge variant="secondary" className="flex-shrink-0">
                          Processed
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
