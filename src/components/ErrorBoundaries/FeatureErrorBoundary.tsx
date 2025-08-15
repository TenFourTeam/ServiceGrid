import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Feature-level error boundary for granular error handling
 * Prevents one feature's errors from breaking the entire app
 */
export class FeatureErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[${this.props.feature}] Feature error:`, error, errorInfo);
    
    // TODO: Send to error reporting service
    // errorReporting.captureException(error, {
    //   tags: { feature: this.props.feature },
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
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Something went wrong</h3>
          </div>
          
          <p className="text-sm text-muted-foreground max-w-md">
            The {this.props.feature} feature encountered an error. 
            You can try refreshing or continue using other parts of the app.
          </p>
          
          {this.state.error && (
            <details className="text-xs text-muted-foreground max-w-md">
              <summary className="cursor-pointer">Technical details</summary>
              <pre className="mt-2 text-left bg-muted p-2 rounded text-xs overflow-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
          
          <Button onClick={this.handleRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrappers for common features
export const OnboardingErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <FeatureErrorBoundary feature="onboarding">{children}</FeatureErrorBoundary>
);

export const ProfileErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <FeatureErrorBoundary feature="profile">{children}</FeatureErrorBoundary>
);