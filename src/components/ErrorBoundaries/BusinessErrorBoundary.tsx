import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Business-specific error boundary for handling business context failures
 * Provides recovery actions when business data fails to load
 */
export class BusinessErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[BusinessErrorBoundary] Business context error:', error, errorInfo);
    
    // TODO: Send to error reporting service
    // errorReporting.captureException(error, {
    //   tags: { feature: 'business-context' },
    //   extra: errorInfo,
    // });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 space-y-6 text-center bg-background">
          <div className="flex items-center space-x-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Business Context Error</h2>
          </div>
          
          <div className="max-w-md space-y-3">
            <p className="text-muted-foreground">
              There was an issue loading your business information. This may be due to a temporary network issue.
            </p>
            
            <div className="flex flex-col space-y-2">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Refresh Page
              </Button>
            </div>
          </div>
          
          {this.state.error && (
            <details className="text-xs text-muted-foreground max-w-md">
              <summary className="cursor-pointer">Technical details</summary>
              <pre className="mt-2 text-left bg-muted p-3 rounded text-xs overflow-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based business error display component
 * Shows inline error states when business queries fail
 */
export function BusinessErrorDisplay() {
  const { hasBusinessError, businessError, refetchBusiness } = useBusinessContext();

  if (!hasBusinessError) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">
          Failed to load business data
        </span>
      </div>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => refetchBusiness()}
        className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Retry
      </Button>
    </div>
  );
}