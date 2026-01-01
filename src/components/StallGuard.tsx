import { useEffect, useState } from 'react';
import { subscribeToBootState, getBootDiagnostics, clearAppCache, BootState } from '@/lib/boot-trace';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Copy, RefreshCw, CheckCircle } from 'lucide-react';

const STALL_TIMEOUT_MS = 12000; // 12 seconds

// Public routes that should never show the stall guard
const PUBLIC_BYPASS_ROUTES = [
  '/auth',
  '/customer-login',
  '/customer-invite',
  '/customer-magic',
  '/customer-reset-password',
  '/',
  '/pricing',
  '/roadmap',
  '/changelog',
  '/blog',
  '/resources',
];

interface StallGuardProps {
  children: React.ReactNode;
}

export function StallGuard({ children }: StallGuardProps) {
  const [bootState, setBootState] = useState<BootState | null>(null);
  const [isStalled, setIsStalled] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Check if current route should bypass stall detection using window.location
  // (we can't use useLocation here since StallGuard wraps the Router)
  const shouldBypass = PUBLIC_BYPASS_ROUTES.some(route => 
    window.location.pathname === route || window.location.pathname.startsWith(route + '/')
  );

  useEffect(() => {
    const unsubscribe = subscribeToBootState(setBootState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!bootState || bootState.stage === 'app_ready') {
      setIsStalled(false);
      return;
    }

    const timer = setTimeout(() => {
      if (bootState.stage !== 'app_ready') {
        setIsStalled(true);
      }
    }, STALL_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [bootState?.stage]);

  const handleCopyDiagnostics = async () => {
    const diagnostics = getBootDiagnostics();
    try {
      await navigator.clipboard.writeText(diagnostics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const handleHardRefresh = () => {
    window.location.reload();
  };

  // If on a public route, skip the stall check entirely
  if (shouldBypass) {
    return <>{children}</>;
  }

  if (isStalled && bootState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">
              Loading is taking longer than expected
            </h1>
            <p className="text-sm text-muted-foreground">
              Stuck at: <span className="font-medium text-foreground">{bootState.stageLabel}</span>
            </p>
            {bootState.error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mt-2">
                {bootState.error}
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-2">
            <p className="font-medium text-foreground">Try these steps:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Hard refresh the page (Ctrl/Cmd + Shift + R)</li>
              <li>Try in an incognito/private window</li>
              <li>Disable ad blockers or privacy extensions</li>
              <li>Check your internet connection</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="default"
              onClick={handleHardRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
            
            <Button
              variant="outline"
              onClick={clearAppCache}
              className="gap-2"
            >
              Reset App Cache
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyDiagnostics}
            className="gap-2 text-muted-foreground"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Diagnostics
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            If this persists, please contact support with the diagnostics.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
