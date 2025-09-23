import { useAuth, useSignUp } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function OrganizationSignup() {
  const { isSignedIn, isLoaded } = useAuth();
  const { signUp } = useSignUp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) return;

    // If user is already signed in, redirect to the intended page
    if (isSignedIn) {
      const redirectUrl = searchParams.get('redirect_url');
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        navigate('/calendar');
      }
      return;
    }

    // Get the signup context from URL
    const signupContextParam = searchParams.get('signup_context');
    if (signupContextParam) {
      try {
        const signupContext = JSON.parse(decodeURIComponent(signupContextParam));
        
        // Store the signup context in localStorage for the signup process
        localStorage.setItem('clerk_signup_context', JSON.stringify(signupContext));
        
        console.log('🏢 [OrganizationSignup] Stored signup context:', signupContext);
        
        // Redirect to regular Clerk auth with the signup context stored
        const redirectUrl = searchParams.get('redirect_url') || '/calendar';
        navigate(`/clerk-auth?redirect_url=${encodeURIComponent(redirectUrl)}`);
        
      } catch (error) {
        console.error('❌ [OrganizationSignup] Failed to parse signup context:', error);
        navigate('/clerk-auth');
      }
    } else {
      // No signup context, redirect to regular auth
      navigate('/clerk-auth');
    }
  }, [isLoaded, isSignedIn, searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Setting up your invitation...</p>
      </div>
    </div>
  );
}