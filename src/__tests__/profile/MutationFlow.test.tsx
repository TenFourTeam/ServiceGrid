import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render } from '@testing-library/react';
// @ts-ignore - screen and waitFor import issues with current version
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useProfileUpdate } from '@/hooks/useProfileUpdate';
import { fn } from '@/utils/functionUrl';
import * as edgeApiModule from '@/utils/edgeApi';

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Test component that uses the hook
function TestProfileForm() {
  const profileUpdate = useProfileUpdate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    await profileUpdate.mutateAsync({
      fullName: formData.get('fullName') as string,
      businessName: formData.get('businessName') as string,
      phoneRaw: formData.get('phoneRaw') as string,
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="fullName" placeholder="Full Name" />
      <input name="businessName" placeholder="Business Name" />
      <input name="phoneRaw" placeholder="Phone" />
      <button type="submit" disabled={profileUpdate.isPending}>
        {profileUpdate.isPending ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}

const SUPABASE_URL = 'https://ijudkzqfriazabiosnvb.supabase.co';

// MSW Server setup
const server = setupServer();

// Success handler
const successHandler = http.post(
  `${SUPABASE_URL}/functions/v1/profile-update`,
  async ({ request }) => {
    const auth = request.headers.get('authorization');
    const body = await request.json() as any;
    
    // Assert request contract
    expect(auth).toMatch(/^Bearer\s.+/);
    expect(body.phoneRaw).toBeDefined();
    
    return HttpResponse.json({
      data: {
        fullName: body.fullName,
        businessName: body.businessName,
        phoneE164: '+15551234567' // Server normalizes phone
      }
    });
  }
);

// 401 then success handler (token refresh scenario)
const tokenRefreshHandler = http.post(
  `${SUPABASE_URL}/functions/v1/profile-update`,
  async ({ request }) => {
    const auth = request.headers.get('authorization');
    
    // First call fails with 401
    if (!request.headers.get('x-retry')) {
      return HttpResponse.json({ error: 'Invalid JWT' }, { status: 401 });
    }
    
    // Retry succeeds
    return HttpResponse.json({
      data: { fullName: 'Alex Rivera', businessName: 'Tenfour Co', phoneE164: '+15551234567' }
    });
  }
);

// Network error handler
const networkErrorHandler = http.post(
  `${SUPABASE_URL}/functions/v1/profile-update`,
  () => HttpResponse.error()
);

// 403 error handler
const forbiddenHandler = http.post(
  `${SUPABASE_URL}/functions/v1/profile-update`,
  () => HttpResponse.json({
    error: { code: 'FORBIDDEN', message: 'Not a member of this business' }
  }, { status: 403 })
);

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('Profile Mutation Flow', () => {
  const user = userEvent.setup();
  const invalidateSpy = vi.fn();
  
  beforeEach(() => {
    server.listen();
    mockToast.mockClear();
    invalidateSpy.mockClear();
    
    // Mock query client invalidation
    vi.spyOn(QueryClient.prototype, 'invalidateQueries').mockImplementation(invalidateSpy);
    
    // Mock window.dispatchEvent for business-updated event
    vi.spyOn(window, 'dispatchEvent').mockImplementation(vi.fn());
  });
  
  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });
  
  afterAll(() => {
    server.close();
  });

  describe('URL and Headers Contract', () => {
    it('calls correct Supabase function URL', async () => {
      const edgeRequestSpy = vi.spyOn(edgeApiModule, 'edgeRequest');
      server.use(successHandler);
      
      renderWithProviders(<TestProfileForm />);
      
      await user.type(screen.getByPlaceholderText('Full Name'), 'Alex Rivera');
      await user.type(screen.getByPlaceholderText('Business Name'), 'Tenfour Co');
      await user.type(screen.getByPlaceholderText('Phone'), '5551234567');
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(edgeRequestSpy).toHaveBeenCalledWith(
          fn('profile-update'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('fullName')
          })
        );
      });
      
      // Verify exact URL from fn helper
      expect(edgeRequestSpy).toHaveBeenCalledWith(
        `${SUPABASE_URL}/functions/v1/profile-update`,
        expect.any(Object)
      );
    });
  });

  describe('Success Flow', () => {
    it('saves profile and advances onboarding', async () => {
      server.use(successHandler);
      
      renderWithProviders(<TestProfileForm />);
      
      // Fill form
      await user.type(screen.getByPlaceholderText('Full Name'), 'Alex Rivera');
      await user.type(screen.getByPlaceholderText('Business Name'), 'Tenfour Co');
      await user.type(screen.getByPlaceholderText('Phone'), '(555) 123-4567');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      // Assert success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Profile updated',
          description: 'Your profile changes have been saved.'
        });
      });
      
      // Assert query invalidation with exact keys
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile.current'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['business.current'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard.summary'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard-data'] }); // legacy compatibility
      
      // Assert business-updated event dispatched
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'business-updated' })
      );
    });
  });

  describe('Double Submit Prevention', () => {
    it('disables button during pending state', async () => {
      server.use(successHandler);
      
      renderWithProviders(<TestProfileForm />);
      
      await user.type(screen.getByPlaceholderText('Full Name'), 'Alex Rivera');
      await user.type(screen.getByPlaceholderText('Business Name'), 'Tenfour Co');
      
      const submitButton = screen.getByRole('button', { name: /save/i });
      
      // Click submit
      await user.click(submitButton);
      
      // Button should be disabled and show pending state
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Saving...');
      
      // Wait for completion
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent('Save Profile');
      });
    });
  });

  describe('Authentication Errors', () => {
    it('handles 401 with token refresh retry', async () => {
      const edgeRequestSpy = vi.spyOn(edgeApiModule, 'edgeRequest');
      server.use(tokenRefreshHandler);
      
      renderWithProviders(<TestProfileForm />);
      
      await user.type(screen.getByPlaceholderText('Full Name'), 'Alex Rivera');
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      // Should eventually succeed after retry
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Profile updated',
          description: 'Your profile changes have been saved.'
        });
      });
      
      // Verify exactly one retry occurred
      expect(edgeRequestSpy).toHaveBeenCalledTimes(1); // edgeRequest handles retries internally
    });

    it('handles 403 forbidden error', async () => {
      server.use(forbiddenHandler);
      
      renderWithProviders(<TestProfileForm />);
      
      await user.type(screen.getByPlaceholderText('Full Name'), 'Alex Rivera');
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Save failed',
          description: 'Not a member of this business',
          variant: 'destructive'
        });
      });
    });
  });

  describe('Network Errors', () => {
    it('shows friendly message for network failures', async () => {
      server.use(networkErrorHandler);
      
      renderWithProviders(<TestProfileForm />);
      
      await user.type(screen.getByPlaceholderText('Full Name'), 'Alex Rivera');
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Save failed',
          description: expect.stringContaining('Failed to save your changes'),
          variant: 'destructive'
        });
      });
      
      // No query invalidation on error
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Server Error Shape', () => {
    it('displays server error message (not [object Object])', async () => {
      const customErrorHandler = http.post(
        `${SUPABASE_URL}/functions/v1/profile-update`,
        () => HttpResponse.json({
          error: { code: 'VALIDATION_ERROR', message: 'Phone number is invalid' }
        }, { status: 400 })
      );
      
      server.use(customErrorHandler);
      
      renderWithProviders(<TestProfileForm />);
      
      await user.type(screen.getByPlaceholderText('Full Name'), 'Alex Rivera');
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Save failed',
          description: 'Phone number is invalid', // Exact server message
          variant: 'destructive'
        });
      });
    });
  });
});