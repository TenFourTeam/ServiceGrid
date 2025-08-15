import AppLayout from '@/components/Layout/AppLayout';
import { useProfile } from '@/queries/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import BusinessLogo from '@/components/BusinessLogo';
import { useState, useEffect, useRef } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { toast as sonnerToast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ConnectBanner from '@/components/Stripe/ConnectBanner';
import { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useProfileOperations } from '@/hooks/useProfileOperations';
import { useBusinessOperations } from '@/hooks/useBusinessOperations';


import { useToast } from '@/hooks/use-toast';
import { formatPhoneInput } from '@/utils/validation';
import { formatNameSuggestion } from '@/validation/profile';
import { useLogoOperations } from '@/hooks/useLogoOperations';

export default function SettingsPage() {
  const { business } = useBusinessContext();
  const { data: profile } = useProfile();
  const {
    getToken,
    isSignedIn
  } = useClerkAuth();
  const [darkFile, setDarkFile] = useState<File | null>(null);
  const [lightFile, setLightFile] = useState<File | null>(null);
  const [sub, setSub] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);
  const { data: connectStatus, isLoading: statusLoading } = useStripeConnectStatus();
  const statusError = null;
  const { user, isLoaded: userLoaded } = useUser();
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const { role, canManage } = useBusinessContext();
  const { updateProfile, isUpdating } = useProfileOperations();
  const { updateBusiness, isUpdating: isUpdatingBusiness } = useBusinessOperations();
  const { uploadLogo, isUploading: isUploadingLogo } = useLogoOperations();
  const { toast } = useToast();
  function handleLogoUpload(kind: 'dark' | 'light') {
    const file = kind === 'dark' ? darkFile : lightFile;
    if (!file) {
      return;
    }
    
    uploadLogo.mutate({ file, kind });
  }
  async function refreshSubscription() {
    try {
      setSubLoading(true);
      const data = await edgeRequest(fn('check-subscription'), {
        method: 'POST'
      });
      setSub(data || null);
    } catch (e: any) {
      sonnerToast.error(e?.message || 'Failed to refresh subscription');
    } finally {
      setSubLoading(false);
    }
  }
  async function startCheckout(plan: 'monthly' | 'yearly') {
    try {
      const data = await edgeRequest(fn('create-checkout'), {
        method: 'POST',
        body: JSON.stringify({ plan })
      });
      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error('No checkout URL');
      window.open(url, '_blank');
    } catch (e: any) {
      sonnerToast.error(e?.message || 'Failed to start checkout');
    }
  }
  async function openPortal() {
    try {
      const data = await edgeRequest(fn('customer-portal'), {
        method: 'POST'
      });
      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error('No portal URL');
      window.open(url, '_blank');
    } catch (e: any) {
      sonnerToast.error(e?.message || 'Failed to open portal');
    }
  }
  async function handleStripeConnect() {
    try {
      const data = await edgeRequest(fn('connect-onboarding-link'), {
        method: 'POST'
      });
      const url = (data as any)?.url as string | undefined;
      if (url) window.open(url, '_blank');
    } catch (e: any) {
      sonnerToast.error(e?.message || 'Failed to start Stripe onboarding');
    }
  }
  // Hydrate from profile and business data
  useEffect(() => {
    if (profile) {
      if (!userName && profile.fullName) {
        setUserName(profile.fullName);
      }
      if (!userPhone && profile.phoneE164) {
        setUserPhone(profile.phoneE164);
      }
    }
  }, [profile, userName, userPhone]);

  useEffect(() => {
    if (business && !businessName) {
      setBusinessName(business.name || 'My Business');
    }
  }, [business, businessName]);



  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim() || !userPhone.trim() || !businessName.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in your name, phone number, and business name",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update profile and business in parallel
      const profilePromise = updateProfile.mutateAsync({ 
        fullName: userName.trim(), 
        phoneRaw: userPhone.trim(),
      });

      const businessPromise = updateBusiness.mutateAsync({
        businessName: businessName.trim(),
        phone: business?.phone,
        replyToEmail: business?.replyToEmail,
      });

      await Promise.all([profilePromise, businessPromise]);
      
      // Optional non-blocking Clerk sync
      if (user && userName.trim()) {
        try {
          const parts = userName.trim().split(' ');
          const firstName = parts.shift() || '';
          const lastName = parts.join(' ');
          await user.update({ firstName, lastName });
        } catch (clerkError) {
          console.warn('Clerk sync failed (non-blocking):', clerkError);
        }
      }
    } catch (error) {
      console.error('Profile/Business update failed:', error);
    }
  };

  // Handle phone changes with real-time formatting
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value);
    setUserPhone(formatted);
  };

  // Get formatting suggestions
  const userNameSuggestion = formatNameSuggestion(userName);
  const shouldShowUserNameSuggestion = userName && userNameSuggestion !== userName;
  useEffect(() => {
    // Hydrate business from server to ensure persistence across devices
    if (!isSignedIn) return;
    (async () => {
      try {
        const data = await edgeRequest(fn('get-business'));
        const b = (data as any)?.business;
        if (b?.id) {
          // Business data will be handled by React Query
        }
        // Auto-refresh subscription on mount and after checkout redirect
        const params = new URLSearchParams(window.location.search);
        if (params.get('checkout') === 'success' || params.get('checkout') === 'canceled') {
          await refreshSubscription();
        } else {
          await refreshSubscription();
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [isSignedIn]);
  return <AppLayout title="Settings">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <Label>Name</Label>
                <div className="space-y-2">
                  <Input 
                    value={userName} 
                    onChange={e => setUserName(e.target.value)} 
                    placeholder="Your full name" 
                    required
                  />
                  {shouldShowUserNameSuggestion && (
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setUserName(userNameSuggestion)}
                    >
                      ✨ Use "{userNameSuggestion}"
                    </Button>
                  )}
                </div>
              </div>
               <div>
                 <Label>Business Name</Label>
                 <Input 
                   value={businessName} 
                   onChange={e => setBusinessName(e.target.value)}
                   placeholder="Your business name"
                   required
                 />
               </div>
              <div>
                <Label>Phone Number</Label>
                <Input 
                  value={userPhone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                  type="tel"
                  required
                />
              </div>
              
                <div className="pt-4">
                 <Button 
                   type="submit"
                   disabled={isUpdating || isUpdatingBusiness || !userName.trim() || !userPhone.trim() || !businessName.trim()}
                   className="w-full"
                 >
                  {(isUpdating || isUpdatingBusiness) ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Dark Icon</Label>
              <div className="flex items-center gap-4">
                <div className="shrink-0 w-14 h-14 rounded-lg bg-background p-2 border border-border shadow-sm -ml-1 flex items-center justify-center overflow-hidden">
                  <BusinessLogo size={40} src={business?.logoUrl} alt="Dark icon preview" />
                </div>
                <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={e => setDarkFile(e.target.files?.[0] || null)} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button onClick={() => handleLogoUpload('dark')} disabled={isUploadingLogo || !darkFile}>{isUploadingLogo ? 'Uploading…' : 'Upload dark icon'}</Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Used across the app (sidebar, headers). Use PNG/SVG/WebP. Recommended size: 32x32.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Light Icon</Label>
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-14 h-14 rounded-lg bg-primary p-2 shadow-sm -ml-1 flex items-center justify-center overflow-hidden">
                <BusinessLogo size={40} src={business?.lightLogoUrl} alt="Light icon preview" />
              </div>
              <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={e => setLightFile(e.target.files?.[0] || null)} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button onClick={() => handleLogoUpload('light')} disabled={isUploadingLogo || !lightFile}>{isUploadingLogo ? 'Uploading…' : 'Upload light icon'}</Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    Used in emails and email previews. Use a white/light version. Use PNG/SVG/WebP. Recommended size: 32x32.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <ConnectBanner
              loading={statusLoading} 
              error={null} 
              chargesEnabled={connectStatus?.chargesEnabled} 
              payoutsEnabled={connectStatus?.payoutsEnabled} 
              detailsSubmitted={connectStatus?.detailsSubmitted} 
              bankLast4={null} 
              scheduleText={null} 
              onConnect={handleStripeConnect} 
              onRefresh={() => window.location.reload()} 
              onDisconnect={async () => {
              try {
                await edgeRequest(fn('connect-disconnect'), { method: 'POST' });
                window.location.reload();
                sonnerToast.success('Disconnected from Stripe');
              } catch (e: any) {
                sonnerToast.error(e?.message || 'Failed to disconnect');
              }
            }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-sm">{sub?.subscribed ? `Active • ${sub?.subscription_tier || ''}` : 'Not subscribed'}</div>
              </div>
              
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => startCheckout('monthly')}>Start Monthly ($50)</Button>
              <Button size="sm" onClick={() => startCheckout('yearly')}>Start Yearly ($504)</Button>
              <Button size="sm" variant="secondary" onClick={openPortal}>Manage Subscription</Button>
            </div>
          </CardContent>
        </Card>


      </div>
    </AppLayout>;
}
