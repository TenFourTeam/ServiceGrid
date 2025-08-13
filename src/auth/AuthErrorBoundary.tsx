import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { 
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
};

type State = { 
  hasError: boolean; 
  error?: Error;
};

function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  const isAuthError = error.message.includes('auth') || 
                     error.message.includes('token') || 
                     error.message.includes('401');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>
            {isAuthError ? 'Authentication Error' : 'Something went wrong'}
          </CardTitle>
          <CardDescription>
            {isAuthError 
              ? 'Your session has expired or there was an authentication error. Please sign in again.'
              : 'An unexpected error occurred. Please try again or refresh the page.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={retry}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>

          {isAuthError && (
            <Button 
              variant="outline"
              onClick={() => {
                window.location.href = '/clerk-auth';
              }}
              className="w-full"
            >
              Sign In Again
            </Button>
          )}

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Error Details
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
              {error.message}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

class AuthErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log auth-related errors
    if (error.message.includes('auth') || 
        error.message.includes('token') || 
        error.message.includes('401')) {
      console.error('[AuthErrorBoundary] Authentication error:', error, errorInfo);
      
      // Here you could send to analytics/monitoring
      // analytics.track('auth_error', { error: error.message, stack: error.stack });
    } else {
      console.error('[AuthErrorBoundary] Application error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          retry={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;