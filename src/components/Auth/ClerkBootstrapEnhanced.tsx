import { useEffect, useRef, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

// Enhanced bootstrap with circuit breaker and "repair account" fallback
export default function ClerkBootstrapEnhanced() {
  const { isSignedIn, getToken } = useClerkAuth();
  const ranRef = useRef(false);
  const failureCountRef = useRef(0);
  const [showRepairUI, setShowRepairUI] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const MAX_FAILURES = 3;
  const FAILURE_RESET_TIME = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (!isSignedIn) {
      ranRef.current = false;
      failureCountRef.current = 0;
      setShowRepairUI(false);
      return;
    }
    
    if (ranRef.current || showRepairUI) return;
    ranRef.current = true;
    
    // Run bootstrap with circuit breaker
    queueMicrotask(async () => {
      try {
        console.info('[ClerkBootstrap] Starting bootstrap process');
        await edgeFetchJson("clerk-bootstrap", getToken, { method: "POST" });
        console.info('[ClerkBootstrap] Bootstrap completed successfully');
        
        // Reset failure count on success
        failureCountRef.current = 0;
        setShowRepairUI(false);
        
      } catch (e: any) {
        failureCountRef.current++;
        console.error(`[ClerkBootstrap] Bootstrap failed (attempt ${failureCountRef.current}/${MAX_FAILURES}):`, e);
        
        if (failureCountRef.current >= MAX_FAILURES) {
          console.error('[ClerkBootstrap] Max failures reached, showing repair UI');
          setShowRepairUI(true);
          
          // Reset failure count after timeout
          setTimeout(() => {
            failureCountRef.current = 0;
          }, FAILURE_RESET_TIME);
        } else {
          // Retry after exponential backoff
          const delay = Math.pow(2, failureCountRef.current) * 1000;
          setTimeout(() => {
            ranRef.current = false; // Allow retry
          }, delay);
        }
      }
    });
  }, [isSignedIn, getToken, showRepairUI]);

  const handleRepairAccount = async () => {
    setIsRepairing(true);
    try {
      console.info('[ClerkBootstrap] Manual repair attempt');
      await edgeFetchJson("clerk-bootstrap", getToken, { method: "POST" });
      
      failureCountRef.current = 0;
      setShowRepairUI(false);
      ranRef.current = true;
      
      console.info('[ClerkBootstrap] Manual repair successful');
    } catch (e) {
      console.error('[ClerkBootstrap] Manual repair failed:', e);
    } finally {
      setIsRepairing(false);
    }
  };

  if (!showRepairUI) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Alert className="max-w-md mx-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="mt-2">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Account Setup Needed</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We're having trouble setting up your account. This usually resolves itself, but you can try repairing it manually.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleRepairAccount} 
                disabled={isRepairing}
                size="sm"
              >
                {isRepairing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Repairing...
                  </>
                ) : (
                  'Repair Account'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                size="sm"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}