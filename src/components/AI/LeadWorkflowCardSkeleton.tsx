import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for LeadWorkflowCard
 * Shows the shape of the card while data is loading
 */
export function LeadWorkflowCardSkeleton() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-7 w-7 rounded" />
        </div>
        
        {/* Progress bar skeleton */}
        <div className="flex items-center gap-3 mt-2">
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-4 w-8" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 p-2">
            <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
