import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function ReferralLanding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const referralCode = searchParams.get('ref');

  useEffect(() => {
    // Store referral code in sessionStorage for use after signup
    if (referralCode) {
      sessionStorage.setItem('referral_code', referralCode);
      console.log('Stored referral code:', referralCode);
      
      // Track the referral click (non-blocking)
      supabase.functions.invoke('track-referral', {
        body: { referral_code: referralCode }
      }).catch((error) => {
        // Silently log tracking failures - don't block the user experience
        console.log('Referral tracking skipped:', error);
      });
    }
  }, [referralCode]);

  const handleGetStarted = () => {
    navigate('/auth', { state: { referralCode } });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4">
            <UserPlus className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">
            You've Been Invited!
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Join ServiceGrid and streamline your service business operations
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-sm">
                <strong>Quotes & Invoices:</strong> Professional documents in minutes
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-sm">
                <strong>Schedule Management:</strong> Keep track of jobs and team
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-sm">
                <strong>Customer Portal:</strong> Let customers approve quotes online
              </p>
            </div>
          </div>

          <Button 
            onClick={handleGetStarted}
            size="lg"
            className="w-full"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
