import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueryClientClerkIntegration } from '@/auth/QueryClientClerkIntegration';

// Mock Clerk auth
const mockAuth = {
  isLoaded: true,
  isSignedIn: true
};

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => mockAuth
}));

function renderWithQueryClient(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <QueryClientClerkIntegration />
    </QueryClientProvider>
  );
}

describe('QueryClientClerkIntegration', () => {
  let queryClient: QueryClient;
  let clearSpy: ReturnType<typeof vi.spyOn>;
  let refetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    clearSpy = vi.spyOn(queryClient, 'clear');
    refetchSpy = vi.spyOn(queryClient, 'refetchQueries');
    
    mockAuth.isLoaded = true;
    mockAuth.isSignedIn = true;
  });

  it('renders without crashing', () => {
    const { container } = renderWithQueryClient(queryClient);
    expect(container.firstChild).toBeNull(); // Should render nothing
  });

  it('does nothing when auth is not loaded', () => {
    mockAuth.isLoaded = false;
    renderWithQueryClient(queryClient);
    
    expect(clearSpy).not.toHaveBeenCalled();
    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it('clears cache when user signs out', () => {
    // First render - user is signed in
    const { rerender } = renderWithQueryClient(queryClient);
    
    // User signs out
    mockAuth.isSignedIn = false;
    rerender(
      <QueryClientProvider client={queryClient}>
        <QueryClientClerkIntegration />
      </QueryClientProvider>
    );
    
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it('refetches queries when user signs in', () => {
    // First render - user is signed out
    mockAuth.isSignedIn = false;
    const { rerender } = renderWithQueryClient(queryClient);
    
    // User signs in
    mockAuth.isSignedIn = true;
    rerender(
      <QueryClientProvider client={queryClient}>
        <QueryClientClerkIntegration />
      </QueryClientProvider>
    );
    
    expect(refetchSpy).toHaveBeenCalledWith({ type: 'active' });
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('does nothing on subsequent renders with same auth state', () => {
    const { rerender } = renderWithQueryClient(queryClient);
    
    // Re-render with same auth state
    rerender(
      <QueryClientProvider client={queryClient}>
        <QueryClientClerkIntegration />
      </QueryClientProvider>
    );
    
    expect(clearSpy).not.toHaveBeenCalled();
    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it('handles auth loading → signed in transition', () => {
    // Start with loading
    mockAuth.isLoaded = false;
    mockAuth.isSignedIn = false;
    const { rerender } = renderWithQueryClient(queryClient);
    
    // Finish loading and user is signed in
    mockAuth.isLoaded = true;
    mockAuth.isSignedIn = true;
    rerender(
      <QueryClientProvider client={queryClient}>
        <QueryClientClerkIntegration />
      </QueryClientProvider>
    );
    
    expect(refetchSpy).toHaveBeenCalledWith({ type: 'active' });
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('handles auth loading → signed out transition', () => {
    // Start with loading
    mockAuth.isLoaded = false;
    mockAuth.isSignedIn = true; // This gets ignored when not loaded
    const { rerender } = renderWithQueryClient(queryClient);
    
    // Finish loading and user is signed out
    mockAuth.isLoaded = true;
    mockAuth.isSignedIn = false;
    rerender(
      <QueryClientProvider client={queryClient}>
        <QueryClientClerkIntegration />
      </QueryClientProvider>
    );
    
    // Should not clear cache since user was never "signed in" during the component lifecycle
    expect(clearSpy).not.toHaveBeenCalled();
    expect(refetchSpy).not.toHaveBeenCalled();
  });
});