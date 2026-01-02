import React from "react";
import { setBootStage, getBootDiagnostics, clearAppCache } from "@/lib/boot-trace";

type Props = { children: React.ReactNode };

type State = { 
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ errorInfo: info });
    
    // Log structured error for debugging
    console.error("[ErrorBoundary] Caught error:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: info.componentStack,
    });
    
    // Update boot stage to error
    setBootStage('error', `${error.name}: ${error.message.slice(0, 100)}`);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleCopyDiagnostics = () => {
    const { error, errorInfo } = this.state;
    const diagnostics = `${getBootDiagnostics()}

Error: ${error?.name || 'Unknown'}
Message: ${error?.message || 'No message'}
Stack: ${error?.stack || 'No stack'}

Component Stack: ${errorInfo?.componentStack || 'No component stack'}`;
    
    navigator.clipboard.writeText(diagnostics).then(() => {
      alert('Diagnostics copied to clipboard');
    });
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      
      return (
        <div className="min-h-screen grid place-items-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center space-y-4">
            <h1 className="text-2xl font-semibold text-destructive">Something went wrong</h1>
            
            {/* Show error details in development or when debug param is present */}
            {(process.env.NODE_ENV === 'development' || window.location.search.includes('debug')) && error && (
              <div className="text-left bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm font-mono overflow-auto max-h-48">
                <p className="font-bold text-destructive">{error.name}: {error.message}</p>
                {error.stack && (
                  <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                    {error.stack.split('\n').slice(1, 6).join('\n')}
                  </pre>
                )}
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              {error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            
            <div className="flex flex-wrap justify-center gap-3">
              <button
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={this.handleRetry}
              >
                Try again
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => clearAppCache()}
              >
                Clear cache & reload
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors"
                onClick={this.handleCopyDiagnostics}
              >
                Copy diagnostics
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
