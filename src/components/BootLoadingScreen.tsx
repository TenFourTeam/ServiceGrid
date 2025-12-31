import { useEffect, useState } from 'react';
import { subscribeToBootState, BootState } from '@/lib/boot-trace';

interface BootLoadingScreenProps {
  full?: boolean;
  fallbackLabel?: string;
}

export default function BootLoadingScreen({ full = false, fallbackLabel }: BootLoadingScreenProps) {
  const [bootState, setBootState] = useState<BootState | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToBootState(setBootState);
    return unsubscribe;
  }, []);

  const label = bootState?.stageLabel || fallbackLabel || 'Loading';
  const elapsed = bootState ? Math.round((Date.now() - bootState.startTime) / 1000) : 0;
  const showElapsed = elapsed > 3; // Show elapsed time after 3 seconds

  return (
    <div className={full ? "min-h-screen grid place-items-center bg-background" : "min-h-[50vh] grid place-items-center"}>
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          role="status"
          aria-label="Loading"
        />
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium">{label}…</span>
          {showElapsed && (
            <span className="text-xs text-muted-foreground/60">
              {elapsed}s elapsed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
