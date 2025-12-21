import { Lightbulb, Calendar, Users, Zap, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Suggestion {
  id: string;
  label: string;
  action: string;
  icon?: string;
}

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSuggestionClick: (action: string) => void;
  className?: string;
}

const iconMap: Record<string, any> = {
  calendar: Calendar,
  users: Users,
  zap: Zap,
  trending: TrendingUp,
  clock: Clock,
  default: Lightbulb,
};

export function SuggestionChips({ suggestions, onSuggestionClick, className }: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2 px-4 py-2 border-t border-border/50 bg-muted/30', className)}>
      <span className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
        <Lightbulb className="w-3 h-3" />
        Suggestions:
      </span>
      {suggestions.map((suggestion) => {
        const Icon = iconMap[suggestion.icon || 'default'] || iconMap.default;
        return (
          <Button
            key={suggestion.id}
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/30"
            onClick={() => onSuggestionClick(suggestion.action)}
          >
            <Icon className="w-3 h-3" />
            {suggestion.label}
          </Button>
        );
      })}
    </div>
  );
}

// Default suggestions based on context
export function getContextualSuggestions(currentPage?: string): Suggestion[] {
  const baseSuggestions: Suggestion[] = [
    { id: '1', label: 'Schedule pending jobs', action: 'Schedule all pending jobs', icon: 'calendar' },
    { id: '2', label: "Who's available?", action: "Who's available tomorrow?", icon: 'users' },
    { id: '3', label: 'This week summary', action: "Show me this week's schedule", icon: 'trending' },
  ];

  // Add page-specific suggestions
  if (currentPage?.includes('/calendar')) {
    return [
      { id: 'cal1', label: 'Optimize routes', action: 'Optimize routes for today', icon: 'zap' },
      { id: 'cal2', label: 'Find conflicts', action: 'Are there any scheduling conflicts?', icon: 'clock' },
      ...baseSuggestions.slice(0, 1),
    ];
  }

  if (currentPage?.includes('/jobs')) {
    return [
      { id: 'job1', label: 'Unscheduled jobs', action: 'Show me all unscheduled jobs', icon: 'calendar' },
      { id: 'job2', label: 'Jobs due today', action: 'What jobs are due today?', icon: 'clock' },
      ...baseSuggestions.slice(1, 2),
    ];
  }

  if (currentPage?.includes('/customers')) {
    return [
      { id: 'cust1', label: 'Recent customers', action: 'Show me recently added customers', icon: 'users' },
      { id: 'cust2', label: 'Customer jobs', action: 'Show me customers with pending jobs', icon: 'calendar' },
      ...baseSuggestions.slice(2, 3),
    ];
  }

  if (currentPage?.includes('/invoices')) {
    return [
      { id: 'inv1', label: 'Unpaid invoices', action: 'Show me unpaid invoices', icon: 'trending' },
      { id: 'inv2', label: 'Overdue payments', action: 'Are there any overdue invoices?', icon: 'clock' },
      ...baseSuggestions.slice(0, 1),
    ];
  }

  return baseSuggestions;
}
