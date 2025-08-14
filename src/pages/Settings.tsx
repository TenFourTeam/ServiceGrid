import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import BusinessLogo from '@/components/BusinessLogo';
import { useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { edgeFetch } from '@/utils/edgeApi';
import { toast as sonnerToast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ConnectBanner from '@/components/Stripe/ConnectBanner';
import { useDashboardData } from '@/hooks/useDashboardData';
import { BusinessMembersList } from '@/components/Business/BusinessMembersList';
import { AuditLogsList } from '@/components/Business/AuditLogsList';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useProfileUpdate } from '@/hooks/useProfileUpdate';
import { useToast } from '@/hooks/use-toast';
import { useFocusPulse } from '@/hooks/useFocusPulse';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatPhoneInput, formatNameSuggestion } from '@/utils/validation';

import { cn } from '@/utils/cn';
export default function SettingsPage() {
  const store = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    getToken,
    isSignedIn
  } = useClerkAuth();
  const [darkFile, setDarkFile] = useState<File | null>(null);
  const [lightFile, setLightFile] = useState<File | null>(null);
  const [uploadingDark, setUploadingDark] = useState(false);
  const [uploadingLight, setUploadingLight] = useState(false);
  const [sub, setSub] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);
  const { data: dashboardData } = useDashboardData();
  const connectStatus = dashboardData?.stripeStatus;
  const statusLoading = !dashboardData;
  const statusError = null;
  const { user, isLoaded: userLoaded } = useUser();
  const [userName, setUserName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const { data: roleData } = useBusinessRole(store.business.id);
  const profileUpdate = useProfileUpdate();
  const { toast } = useToast();
  const { ref: profileRef, pulse: profilePulse, focus: focusProfile } = useFocusPulse<HTMLDivElement>();
  async function uploadLogoDark() {
    if (!isSignedIn) {
      sonnerToast.error('You must be signed in');
      return;
    }
    if (!darkFile) {
      sonnerToast.error('Please choose an image file');
      return;
    }
    try {
      setUploadingDark(true);
      const form = new FormData();
      form.append('file', darkFile);
      const data = await edgeFetch("upload-business-logo?kind=dark", getToken, {
        method: 'POST',
        body: form
      });
      const url = (data as any)?.url as string;
      if (url) {
        store.setBusiness({
          logoUrl: url
        });
        sonnerToast.success('Dark icon updated');
      }
    } catch (e: any) {
      console.error(e);
      sonnerToast.error(e?.message || 'Failed to upload dark icon');
    } finally {
      setUploadingDark(false);
    }
  }
  async function uploadLogoLight() {
    if (!isSignedIn) {
      sonnerToast.error('You must be signed in');
      return;
    }
    if (!lightFile) {
      sonnerToast.error('Please choose an image file');
      return;
    }
    try {
      setUploadingLight(true);
      const form = new FormData();
      form.append('file', lightFile);
      const data = await edgeFetch("upload-business-logo?kind=light", getToken, {
        method: 'POST',
        body: form
      });
      const url = (data as any)?.url as string;
      if (url) {
        store.setBusiness({
          lightLogoUrl: url
        });
        sonnerToast.success('Light icon updated');
      }
    } catch (e: any) {
      console.error(e);
      sonnerToast.error(e?.message || 'Failed to upload light icon');
    } finally {
      setUploadingLight(false);
    }
  }
  async function refreshSubscription() {
    try {
      setSubLoading(true);
      const data = await edgeFetch('check-subscription', getToken, {
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
      const data = await edgeFetch('create-checkout', getToken, {
        method: 'POST',
        body: JSON.stringify({ plan }),
        headers: { 'Content-Type': 'application/json' }
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
      const data = await edgeFetch('customer-portal', getToken, {
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
      const data = await edgeFetch('connect-onboarding-link', getToken, {
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

  // Handle business data hydration
  useEffect(() => {
    setBusinessName(store.business.name);
    setBusinessPhone(store.business.phone);
  }, [store.business.name, store.business.phone]);

  // Handle focus from onboarding navigation
  useEffect(() => {
    const state = location.state as any;
    if (state?.focus === 'profile') {
      const timer = setTimeout(() => {
        focusProfile();
        // Clear state to prevent re-triggering
        navigate('.', { replace: true, state: null });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.state, focusProfile, navigate]);

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
    
    if (!userName.trim() || !businessName.trim() || !businessPhone.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const input = { 
      fullName: userName.trim(), 
      businessName: businessName.trim(), 
      phoneRaw: businessPhone.trim() 
    };
    
    console.info('[Settings] saving profile', input);

    try {
      // Update Clerk user first
      if (user) {
        await user.update({
          firstName: userName.split(' ')[0],
          lastName: userName.split(' ').slice(1).join(' ') || '',
        });
      }

      // Then update profile and business in database
      await profileUpdate.mutateAsync(input);

      toast({
        title: "Profile saved",
        description: "Your changes are live.",
      });

    } catch (error: any) {
      console.error('[Settings] profile save failed:', error);
      toast({
        title: "Save failed",
        description: error?.message || "Failed to save your changes. Please check your connection and try again.",
        variant: "destructive",
      });
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
        const data = await edgeFetch('get-business', getToken);
        const b = (data as any)?.business;
        if (b?.id) {
          store.setBusiness({
            id: b.id,
            name: b.name ?? store.business.name,
            phone: b.phone ?? '',
            replyToEmail: b.reply_to_email ?? '',
            logoUrl: b.logo_url ?? '',
            lightLogoUrl: b.light_logo_url ?? '',
            taxRateDefault: Number(b.tax_rate_default ?? store.business.taxRateDefault) || 0,
            numbering: {
              estPrefix: b.est_prefix ?? store.business.numbering.estPrefix,
              estSeq: Number(b.est_seq ?? store.business.numbering.estSeq) || store.business.numbering.estSeq,
              invPrefix: b.inv_prefix ?? store.business.numbering.invPrefix,
              invSeq: Number(b.inv_seq ?? store.business.numbering.invSeq) || store.business.numbering.invSeq
            }
          });
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
        <Card 
          ref={profileRef}
          className={cn(
            "transition-all duration-300",
            profilePulse && "ring-2 ring-primary/60 shadow-lg scale-[1.02]"
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Business Profile
              {profilePulse && (
                <span className="text-xs text-muted-foreground animate-fade-in">
                  Complete your profile here
                </span>
              )}
            </CardTitle>
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
                      required
                    />
                    {profileUpdate.isPending && (
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
                  disabled={profileUpdate.isPending || !userName.trim() || !businessName.trim() || !businessPhone.trim()}
                  className="w-full"
                >
                  {profileUpdate.isPending ? 'Saving...' : 'Save Profile'}
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
                  <BusinessLogo size={40} src={store.business.logoUrl} alt="Dark icon preview" />
                </div>
                <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={e => setDarkFile(e.target.files?.[0] || null)} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button onClick={uploadLogoDark} disabled={uploadingDark || !darkFile}>{uploadingDark ? 'Uploading…' : 'Upload dark icon'}</Button>
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
                <BusinessLogo size={40} src={store.business.lightLogoUrl} alt="Light icon preview" />
              </div>
              <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={e => setLightFile(e.target.files?.[0] || null)} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button onClick={uploadLogoLight} disabled={uploadingLight || !lightFile}>{uploadingLight ? 'Uploading…' : 'Upload light icon'}</Button>
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

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Payouts</CardTitle></CardHeader>
          <CardContent>
            <ConnectBanner 
              loading={!!statusLoading} 
              error={statusError ? statusError.message : null} 
              chargesEnabled={connectStatus?.chargesEnabled} 
              payoutsEnabled={connectStatus?.payoutsEnabled} 
              detailsSubmitted={connectStatus?.detailsSubmitted} 
              bankLast4={null} 
              scheduleText={null} 
              onConnect={handleStripeConnect} 
              onRefresh={() => window.location.reload()} 
              onDisconnect={async () => {
              try {
                await edgeFetch('connect-disconnect', getToken, { method: 'POST' });
                window.location.reload();
                sonnerToast.success('Disconnected from Stripe');
              } catch (e: any) {
                sonnerToast.error(e?.message || 'Failed to disconnect');
              }
            }} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
          <CardContent>
            <BusinessMembersList 
              businessId={store.business.id} 
              canManage={roleData?.canManage || false}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Subscription</CardTitle></CardHeader>
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

        {roleData?.canManage && (
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
            <CardContent>
              <AuditLogsList businessId={store.business.id} />
            </CardContent>
          </Card>
        )}

      </div>
    </AppLayout>;
}