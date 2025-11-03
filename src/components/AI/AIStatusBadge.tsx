import { Sparkles, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { useAIActivityLog } from '@/hooks/useAIActivityLog';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

/**
 * AI Status Badge - Shows AI activity and provides quick access to AI features
 * Displays in the header with pending suggestions count
 */
export function AIStatusBadge() {
  const { pendingSuggestionsCount, recentActivity, dailyDigest, isLoading } = useAIActivityLog();
  const navigate = useNavigate();

  if (isLoading) {
    return null;
  }

  const hasPendingSuggestions = pendingSuggestionsCount > 0;
  const recentActivities = recentActivity.slice(0, 5);

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative gap-2 ai-badge"
        >
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="hidden sm:inline">AI Active</span>
          {hasPendingSuggestions && (
            <Badge 
              variant="secondary" 
              className="ml-1 h-5 w-5 flex items-center justify-center p-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 ai-pulse"
            >
              {pendingSuggestionsCount}
            </Badge>
          )}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Assistant Status
            </h4>
            <p className="text-sm text-muted-foreground">
              Your AI copilot is actively monitoring and optimizing your schedule
            </p>
          </div>

          {/* Daily Summary */}
          {dailyDigest && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Today's Activity</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {dailyDigest.totalSuggestions} suggestions
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {dailyDigest.optimizations} optimizations
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  {dailyDigest.conflictsResolved} conflicts resolved
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  {dailyDigest.autoScheduled} auto-scheduled
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivities.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Recent Activity</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="text-xs p-2 rounded bg-muted/50">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-muted-foreground mt-1">
                      {format(new Date(activity.created_at), 'h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium">Quick Actions</h5>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/calendar')}
                className="justify-start"
              >
                <Calendar className="mr-2 h-4 w-4" />
                View Schedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/analytics')}
                className="justify-start"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
