import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthBoundary, RequireAuth, PublicOnly } from '@/auth/AuthBoundary';
import LoadingScreen from '@/components/LoadingScreen';

// Mock LoadingScreen
vi.mock('@/components/LoadingScreen', () => ({
  default: ({ full }: { full?: boolean }) => (
    <div data-testid="loading-screen" data-full={full}>Loading...</div>
  )
}));

// Mock Clerk auth
const mockAuth = {
  isLoaded: true,
  isSignedIn: true
};

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => mockAuth
}));

// Mock Navigate component to track redirects
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: (props: any) => {
      mockNavigate(props);
      return <div data-testid="navigate" data-to={props.to} data-replace={props.replace} />;
    }
  };
});

function renderWithRouter(ui: React.ReactNode, initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      {ui}
    </MemoryRouter>
  );
}

describe('AuthBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isLoaded = true;
    mockAuth.isSignedIn = true;
  });

  describe('loading states', () => {
    it('shows loading screen when Clerk is not loaded', () => {
      mockAuth.isLoaded = false;
      
      const { container } = renderWithRouter(
        <AuthBoundary requireAuth>
          <div>Protected Content</div>
        </AuthBoundary>
      );
      
      expect(container.querySelector('[data-testid="loading-screen"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="loading-screen"]')).toHaveAttribute('data-full', 'true');
    });
  });

  describe('requireAuth behavior', () => {
    it('renders children when authenticated', () => {
      const { container } = renderWithRouter(
        <AuthBoundary requireAuth>
          <div>Protected Content</div>
        </AuthBoundary>
      );
      
      expect(container).toHaveTextContent('Protected Content');
    });

    it('redirects to clerk-auth when not authenticated', () => {
      mockAuth.isSignedIn = false;
      
      renderWithRouter(
        <AuthBoundary requireAuth>
          <div>Protected Content</div>
        </AuthBoundary>,
        '/dashboard'
      );
      
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/clerk-auth',
        replace: true,
        state: { from: expect.objectContaining({ pathname: '/dashboard' }) }
      });
    });
  });

  describe('publicOnly behavior', () => {
    it('renders children when not authenticated', () => {
      mockAuth.isSignedIn = false;
      
      const { container } = renderWithRouter(
        <AuthBoundary publicOnly>
          <div>Public Content</div>
        </AuthBoundary>
      );
      
      expect(container).toHaveTextContent('Public Content');
    });

    it('redirects to default route when authenticated', () => {
      renderWithRouter(
        <AuthBoundary publicOnly>
          <div>Public Content</div>
        </AuthBoundary>
      );
      
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/calendar',
        replace: true
      });
    });

    it('redirects to custom route when authenticated', () => {
      renderWithRouter(
        <AuthBoundary publicOnly redirectTo="/dashboard">
          <div>Public Content</div>
        </AuthBoundary>
      );
      
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/dashboard',
        replace: true
      });
    });
  });

  describe('no restrictions', () => {
    it('always renders children when no auth requirements', () => {
      const { container } = renderWithRouter(
        <AuthBoundary>
          <div>Always Visible</div>
        </AuthBoundary>
      );
      
      expect(container).toHaveTextContent('Always Visible');
    });
  });
});

describe('RequireAuth convenience component', () => {
  it('wraps children with requireAuth=true', () => {
    mockAuth.isSignedIn = false;
    
    renderWithRouter(<RequireAuth />);
    
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clerk-auth',
      replace: true,
      state: { from: expect.objectContaining({ pathname: '/' }) }
    });
  });
});

describe('PublicOnly convenience component', () => {
  it('wraps children with publicOnly=true', () => {
    renderWithRouter(<PublicOnly />);
    
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/calendar',
      replace: true
    });
  });

  it('accepts custom redirectTo', () => {
    renderWithRouter(<PublicOnly redirectTo="/settings" />);
    
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/settings',
      replace: true
    });
  });
});