import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { SignInButton, useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MagicLinkForm } from '@/components/CustomerPortal/MagicLinkForm';
import { CustomerLoginForm } from '@/components/CustomerPortal/CustomerLoginForm';
import { CustomerRegisterForm } from '@/components/CustomerPortal/CustomerRegisterForm';
import { PasswordResetForm } from '@/components/CustomerPortal/PasswordResetForm';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { CustomerAuthProvider } from '@/components/CustomerPortal/CustomerAuthProvider';
import { Chrome, Mail, Lock, ArrowLeft, Loader2, PartyPopper } from 'lucide-react';

interface InviteState {
  inviteToken?: string;
  email?: string;
  customerName?: string;
  businessName?: string;
}

function CustomerLoginContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn } = useAuth();
  const { isAuthenticated, isLoading } = useCustomerAuth();
  const [activeTab, setActiveTab] = useState<'magic' | 'password' | 'register'>('magic');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  
  // Get invite data from location state
  const inviteState = (location.state as InviteState) || {};
  const { inviteToken, email: inviteEmail, customerName, businessName } = inviteState;

  const from = (location.state as any)?.from?.pathname || '/portal';

  // If coming from invite, default to register tab
  useEffect(() => {
    if (inviteToken && inviteEmail) {
      setActiveTab('register');
    }
  }, [inviteToken, inviteEmail]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to home
        </Link>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Customer Portal</CardTitle>
            <CardDescription>
              Access your projects, documents, and communicate with your contractor
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Invite banner */}
            {inviteToken && businessName && (
              <Alert className="bg-primary/5 border-primary/20">
                <PartyPopper className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <span className="font-medium">{businessName}</span> has invited you to their customer portal!
                  {customerName && (
                    <span className="block text-sm text-muted-foreground mt-1">
                      Welcome, {customerName}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {showPasswordReset ? (
              <PasswordResetForm onBack={() => setShowPasswordReset(false)} />
            ) : (
              <>
                {/* Clerk Sign In - Primary option */}
                <div className="space-y-3">
                  <SignInButton 
                    mode="modal" 
                    forceRedirectUrl="/portal"
                  >
                    <Button variant="outline" className="w-full h-11">
                      <Chrome className="mr-2 h-5 w-5" />
                      Continue with Google
                    </Button>
                  </SignInButton>
                  <p className="text-xs text-center text-muted-foreground">
                    Recommended for repeat customers
                  </p>
                </div>

                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    or
                  </span>
                </div>

                {/* Tab-based auth options */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="magic" className="text-xs sm:text-sm">
                      <Mail className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Magic Link</span>
                      <span className="sm:hidden">Magic</span>
                    </TabsTrigger>
                    <TabsTrigger value="password" className="text-xs sm:text-sm">
                      <Lock className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Password</span>
                      <span className="sm:hidden">Login</span>
                    </TabsTrigger>
                    <TabsTrigger value="register" className="text-xs sm:text-sm">
                      <span className="hidden sm:inline">Create Account</span>
                      <span className="sm:hidden">Register</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="magic" className="mt-4">
                    <MagicLinkForm initialEmail={inviteEmail} />
                  </TabsContent>

                  <TabsContent value="password" className="mt-4">
                    <CustomerLoginForm 
                      onForgotPassword={() => setShowPasswordReset(true)} 
                    />
                  </TabsContent>

                  <TabsContent value="register" className="mt-4">
                    <CustomerRegisterForm 
                      initialEmail={inviteEmail}
                      inviteToken={inviteToken}
                    />
                  </TabsContent>
                </Tabs>

                {/* Help text */}
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Don't have an account? Ask your contractor to send you an invitation.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Business user link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Are you a contractor?{' '}
          <Link to="/clerk-auth" className="text-primary hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CustomerLogin() {
  return (
    <CustomerAuthProvider>
      <CustomerLoginContent />
    </CustomerAuthProvider>
  );
}
