import { useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserCheck, AlertCircle } from "lucide-react";
import { edgeFetchJson } from "@/utils/edgeApi";

export default function ManualBootstrap() {
  const { isSignedIn, getToken } = useClerkAuth();
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const handleBootstrap = async () => {
    if (!isSignedIn) {
      setResult({ error: "Please sign in first" });
      return;
    }

    setIsBootstrapping(true);
    setResult(null);

    try {
      const response = await edgeFetchJson("clerk-bootstrap", getToken, { 
        method: "POST" 
      });
      
      setResult({
        success: true,
        message: `Profile created successfully! User ID: ${response.userId}, Business ID: ${response.businessId}`
      });
    } catch (error: any) {
      console.error("[ManualBootstrap] Bootstrap failed:", error);
      setResult({
        error: error.message || "Bootstrap failed"
      });
    } finally {
      setIsBootstrapping(false);
    }
  };

  if (!isSignedIn) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please sign in to create your profile and business setup.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <UserCheck className="h-4 w-4" />
        <AlertDescription>
          Manual profile setup is now available. Click the button below to create your profile and default business.
        </AlertDescription>
      </Alert>

      <Button 
        onClick={handleBootstrap}
        disabled={isBootstrapping}
        className="w-full"
      >
        {isBootstrapping ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Profile...
          </>
        ) : (
          "Create Profile & Business Setup"
        )}
      </Button>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertDescription>
            {result.success ? result.message : result.error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}