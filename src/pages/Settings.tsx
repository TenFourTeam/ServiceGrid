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
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const { role, canManage } = useBusinessContext();
  const { updateProfile, isUpdating } = useProfileOperations();
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
  useEffect(() => {
    if (userLoaded) {
      const metaName = (user?.unsafeMetadata as any)?.displayName as string | undefined;
      setUserName(metaName || user?.fullName || '');
    }
  }, [userLoaded, user]);

  // Handle profile data hydration - only once to prevent clearing during updates
  useEffect(() => {
    if (profile && !isHydrated) {
      setBusinessName(profile.businessName || '');
      setBusinessPhone(profile.phoneE164 || '');
      setIsHydrated(true);
    }
  }, [profile, isHydrated]);


  useEffect(() => {
    if (!userLoaded || !user) return;
    const name = userName.trim();
    if (!name) return;
    const currentName = ((user.unsafeMetadata as any)?.displayName as string | undefined) || (user.fullName || '');
    if (name === currentName) return;
    const handle = setTimeout(async () => {
      const parts = name.split(' ');
      const firstName = parts.shift() || '';
      const lastName = parts.join(' ');
      try {
        await user.update({ firstName, lastName });
      } catch (err: any) {
        try {
          const existingMeta = (user.unsafeMetadata as any) || {};
          await user.update({ unsafeMetadata: { ...existingMeta, displayName: name } });
        } catch (err2: any) {
          sonnerToast.error(err2?.message || err?.message || 'Failed to update name');
        }
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [userName, userLoaded, user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.info('[Settings] handleProfileSave called');
    
    if (!userName.trim() || !businessPhone.trim()) {
      console.warn('[Settings] validation failed - missing required fields:', {
        hasName: !!userName.trim(),
        hasPhone: !!businessPhone.trim()
      });
      toast({
        title: "Missing information",
        description: "Please fill in your name and phone number",
        variant: "destructive",
      });
      return;
    }

    // Always include current values to ensure persistence
    const input: { fullName: string; phoneRaw: string; businessName: string } = { 
      fullName: userName.trim(), 
      phoneRaw: businessPhone.trim(),
      businessName: businessName.trim() || 'My Business' // Always send business name
    };
    
    console.info('[Settings] saving profile', input);

    // Save to database first (authoritative)
    console.info('[Settings] calling profileUpdate.mutateAsync');
    
    try {
      await updateProfile.mutateAsync(input);
      
      // Non-blocking sync to Clerk after DB success
      if (user && userName.trim()) {
        try {
          const parts = userName.trim().split(' ');
          const firstName = parts.shift() || '';
          const lastName = parts.join(' ');
          
          await user.update({ firstName, lastName });
          console.log('✅ [Settings] Clerk name sync successful');
        } catch (clerkError) {
          console.warn('⚠️ [Settings] Clerk name sync failed (non-blocking):', clerkError);
          // Don't show error to user - DB is source of truth
        }
      }
    } catch (error) {
      console.error('[Settings] Profile update failed:', error);
      // Error handling is done by the hook
    }
  };

  // Handle business name changes with formatting suggestion
  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value);
  };

  // Handle phone changes with real-time formatting
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value);
    setBusinessPhone(formatted);
  };

  // Get formatting suggestions
  const userNameSuggestion = formatNameSuggestion(userName);
  const businessNameSuggestion = formatNameSuggestion(businessName);
  const shouldShowUserNameSuggestion = userName && userNameSuggestion !== userName;
  const shouldShowBusinessNameSuggestion = businessName && businessNameSuggestion !== businessName;
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
                <div className="space-y-2">
                  <div className="relative">
                     <Input 
                       value={businessName} 
                       onChange={e => handleBusinessNameChange(e.target.value)} 
                       placeholder="Your business name"
                     />
                    {isUpdating && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        Saving...
                      </div>
                    )}
                  </div>
                  {shouldShowBusinessNameSuggestion && (
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleBusinessNameChange(businessNameSuggestion)}
                    >
                      ✨ Use "{businessNameSuggestion}"
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input 
                  value={businessPhone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                  type="tel"
                  required
                />
              </div>
              
              <div className="pt-4">
                 <Button 
                   type="submit"
                   disabled={isUpdating || !userName.trim() || !businessPhone.trim()}
                   className="w-full"
                 >
                  {isUpdating ? 'Saving...' : 'Save Profile'}
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
