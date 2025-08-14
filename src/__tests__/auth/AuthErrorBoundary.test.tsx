import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthErrorBoundary from '@/auth/AuthErrorBoundary';

// Component that throws an error when shouldThrow is true
function ThrowingComponent({ shouldThrow = false, errorMessage = 'Test error' }) {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Normal content</div>;
}

// Custom fallback component for testing
function CustomFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div>
      <div data-testid="custom-fallback">Custom Error UI</div>
      <div data-testid="error-message">{error.message}</div>
      <button onClick={retry} data-testid="custom-retry">
        Custom Retry
      </button>
    </div>
  );
}

describe('AuthErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on console.error to verify error logging
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    const { container } = render(
      <AuthErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </AuthErrorBoundary>
    );

    expect(container).toHaveTextContent('Normal content');
  });

  it('renders default error fallback when error occurs', () => {
    const { container } = render(
      <AuthErrorBoundary>
        <ThrowingComponent shouldThrow={true} errorMessage="Test error occurred" />
      </AuthErrorBoundary>
    );

    expect(container).toHaveTextContent('Authentication Error');
    expect(container).toHaveTextContent('Something went wrong with authentication');
    expect(container.querySelector('button')).toHaveTextContent('Try Again');
  });

  it('renders custom fallback when provided', () => {
    const { container } = render(
      <AuthErrorBoundary fallback={CustomFallback}>
        <ThrowingComponent shouldThrow={true} errorMessage="Custom error message" />
      </AuthErrorBoundary>
    );

    expect(container.querySelector('[data-testid="custom-fallback"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="error-message"]')).toHaveTextContent('Custom error message');
    expect(container.querySelector('[data-testid="custom-retry"]')).toBeInTheDocument();
  });

  it('logs errors to console', () => {
    render(
      <AuthErrorBoundary>
        <ThrowingComponent shouldThrow={true} errorMessage="Test logging error" />
      </AuthErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      '[AuthErrorBoundary] Error caught:',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('identifies authentication-specific errors', () => {
    const { container } = render(
      <AuthErrorBoundary>
        <ThrowingComponent shouldThrow={true} errorMessage="Authentication failed: invalid token" />
      </AuthErrorBoundary>
    );

    expect(container).toHaveTextContent('Authentication Error');
    expect(container).toHaveTextContent('There was a problem with your authentication');
  });

  it('handles general errors', () => {
    const { container } = render(
      <AuthErrorBoundary>
        <ThrowingComponent shouldThrow={true} errorMessage="Network connection failed" />
      </AuthErrorBoundary>
    );

    expect(container).toHaveTextContent('Authentication Error');
    expect(container).toHaveTextContent('Something went wrong with authentication');
  });

  it('resets error state when retry button is clicked', () => {
    const { rerender, container } = render(
      <AuthErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </AuthErrorBoundary>
    );

    // Error state should be visible
    expect(container).toHaveTextContent('Authentication Error');

    // Click retry button
    const retryButton = container.querySelector('button');
    if (retryButton) {
      retryButton.click();
    }

    // Re-render with non-throwing component
    rerender(
      <AuthErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </AuthErrorBoundary>
    );

    // Should show normal content again
    expect(container).toHaveTextContent('Normal content');
    expect(container).not.toHaveTextContent('Authentication Error');
  });

  it('resets error state when custom retry is clicked', () => {
    const { rerender, container } = render(
      <AuthErrorBoundary fallback={CustomFallback}>
        <ThrowingComponent shouldThrow={true} />
      </AuthErrorBoundary>
    );

    // Error state should be visible
    expect(container.querySelector('[data-testid="custom-fallback"]')).toBeInTheDocument();

    // Click custom retry button
    const customRetryButton = container.querySelector('[data-testid="custom-retry"]');
    if (customRetryButton) {
      customRetryButton.click();
    }

    // Re-render with non-throwing component
    rerender(
      <AuthErrorBoundary fallback={CustomFallback}>
        <ThrowingComponent shouldThrow={false} />
      </AuthErrorBoundary>
    );

    // Should show normal content again
    expect(container).toHaveTextContent('Normal content');
    expect(container.querySelector('[data-testid="custom-fallback"]')).not.toBeInTheDocument();
  });
});