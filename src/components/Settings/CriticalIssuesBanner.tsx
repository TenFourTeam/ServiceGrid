import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { HealthCheck } from '@/lib/verification/types';

interface CriticalIssuesBannerProps {
  issues: HealthCheck[];
}

const severityColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-amber-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-blue-500 text-white',
  info: 'bg-muted text-muted-foreground',
};

export function CriticalIssuesBanner({ issues }: CriticalIssuesBannerProps) {
  if (issues.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Critical Issues Detected</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-2">
          {issues.slice(0, 5).map((issue) => (
            <li key={issue.id} className="flex items-start gap-2 text-sm">
              <Badge 
                className={severityColors[issue.severity]}
                variant="secondary"
              >
                {issue.severity}
              </Badge>
              <div>
                <span className="font-medium">{issue.name}</span>
                {issue.details && (
                  <p className="text-destructive/80 text-xs mt-0.5">
                    {issue.details}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
        {issues.length > 5 && (
          <p className="mt-2 text-xs text-destructive/70">
            And {issues.length - 5} more issues...
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
