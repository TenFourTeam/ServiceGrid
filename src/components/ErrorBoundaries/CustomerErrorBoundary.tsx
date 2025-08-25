import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class CustomerErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[CustomerErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CustomerErrorBoundary] Error details:', error, errorInfo);
  }

  handleRetry = () => {
    console.info('[CustomerErrorBoundary] Retrying after error');
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-4 border border-destructive/20 bg-destructive/5 rounded-lg">
          <div className="text-destructive font-medium">
            Something went wrong with the customer list
          </div>
          <div className="text-sm text-muted-foreground">
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <Button onClick={this.handleRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CustomerErrorBoundary;