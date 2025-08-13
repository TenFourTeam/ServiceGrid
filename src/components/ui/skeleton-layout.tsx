import { Skeleton } from "./skeleton"

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Trial Banner Skeleton */}
      <div className="h-12 bg-muted/50 border-b" />
      
      <div className="flex flex-1">
        {/* Sidebar Skeleton */}
        <div className="w-64 border-r bg-muted/20 p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
        
        {/* Main Content Skeleton */}
        <div className="flex-1 p-4 md:p-6 flex flex-col min-h-0">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          {/* Content Skeleton */}
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-6 border rounded-lg space-y-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
            
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppLayoutSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col">
      <div className="h-12 bg-muted/50 border-b" />
      
      <div className="flex flex-1">
        <div className="w-64 border-r bg-muted/20 p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
        
        <div className="flex-1 p-4 md:p-6 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          <div className="flex-1">
            {children || (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
                <Skeleton className="h-64 w-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}