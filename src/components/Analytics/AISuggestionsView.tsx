import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeSelector } from './DateRangeSelector';
import { useAnalyticsSummary } from '@/hooks/useAnalyticsSummary';
import { AISuggestionChart } from './AISuggestionChart';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Brain } from 'lucide-react';

interface AISuggestionsViewProps {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
}

export default function AISuggestionsView({ dateRange, onDateRangeChange }: AISuggestionsViewProps) {
  const { data, isLoading, error } = useAnalyticsSummary(dateRange.start, dateRange.end);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load AI suggestions: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const { aiSuggestions } = data;

  if (aiSuggestions.totalSuggestions === 0) {
    return (
      <div className="space-y-4">
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No AI suggestions in this period
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suggestions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiSuggestions.totalSuggestions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              AI recommendations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiSuggestions.accepted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {aiSuggestions.acceptanceRate.toFixed(1)}% acceptance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiSuggestions.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Declined suggestions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acceptance Rate</CardTitle>
          <CardDescription>
            Breakdown of AI suggestion outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AISuggestionChart data={aiSuggestions} />
        </CardContent>
      </Card>

      {aiSuggestions.topRejectionReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Rejection Reasons</CardTitle>
            <CardDescription>
              Common reasons for declining AI suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aiSuggestions.topRejectionReasons.map((reason, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">{reason.reason}</span>
                  <span className="text-sm font-medium">{reason.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
