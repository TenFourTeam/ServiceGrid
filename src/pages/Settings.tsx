import AppLayout from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import BusinessLogo from '@/components/BusinessLogo';
import { useState, useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import ConnectBanner from '@/components/Stripe/ConnectBanner';
import { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useLogoOperations } from '@/hooks/useLogoOperations';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { useBusinessNameForm } from '@/hooks/useBusinessNameForm';

export default function SettingsPage() {
  const { business, role } = useBusinessContext();
  const { isSignedIn, getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const [darkFile, setDarkFile] = useState<File | null>(null);
  const [lightFile, setLightFile] = useState<File | null>(null);
  const [sub, setSub] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);
  const { data: connectStatus, isLoading: statusLoading } = useStripeConnectStatus();
  const { uploadLogo, isUploading: isUploadingLogo } = useLogoOperations();
  
  // Profile form state management
  const {
    userName,
    setUserName,
    userPhone,
    setUserPhone,
    isFormValid: isProfileValid,
    isLoading: isProfileLoading,
    userNameSuggestion,
    shouldShowUserNameSuggestion,
    applySuggestion,
    handleSubmit: handleProfileSubmit,
  } = useSettingsForm();
  
  // Business name form state management
  const businessNameForm = useBusinessNameForm();
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
      const { data, error } = await authApi.invoke('check-subscription', {
        method: 'POST',
        toast: {
          error: 'Failed to refresh subscription'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to refresh subscription');
      }
      
      setSub(data || null);
    } catch (e: any) {
      console.error('[refreshSubscription] error:', e);
    } finally {
      setSubLoading(false);
    }
  }
  async function startCheckout(plan: 'monthly' | 'yearly') {
    try {
      const { data, error } = await authApi.invoke('create-checkout', {
        method: 'POST',
        body: { plan },
        toast: {
          loading: 'Creating checkout session...',
          error: 'Failed to start checkout'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to start checkout');
      }
      
      const url = data?.url as string | undefined;
      if (!url) throw new Error('No checkout URL');
      window.open(url, '_blank');
    } catch (e: any) {
      console.error('[startCheckout] error:', e);
    }
  }
  async function openPortal() {
    try {
      const { data, error } = await authApi.invoke('customer-portal', {
        method: 'POST',
        toast: {
          loading: 'Opening customer portal...',
          error: 'Failed to open portal'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to open portal');
      }
      
      const url = data?.url as string | undefined;
      if (!url) throw new Error('No portal URL');
      window.open(url, '_blank');
    } catch (e: any) {
      console.error('[openPortal] error:', e);
    }
  }
  async function handleStripeConnect() {
    try {
      const { data, error } = await authApi.invoke('connect-onboarding-link', {
        method: 'POST',
        toast: {
          loading: 'Creating Stripe onboarding link...',
          error: 'Failed to start Stripe onboarding'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to start Stripe onboarding');
      }
      
      const url = data?.url as string | undefined;
      if (url) window.open(url, '_blank');
    } catch (e: any) {
      console.error('[handleStripeConnect] error:', e);
    }
  }
  useEffect(() => {
    // Auto-refresh subscription on mount and after checkout redirect
    if (!isSignedIn) return;
    (async () => {
      try {
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
  const isOwner = role === 'owner';
  const pageTitle = isOwner ? "Settings" : "Profile";
  
  return <AppLayout title={pageTitle}>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <Label>Your Name</Label>
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
                      onClick={applySuggestion}
                    >
                      ✨ Use "{userNameSuggestion}"
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input 
                  value={userPhone}
                  onChange={e => setUserPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  type="tel"
                  required
                />
              </div>
              
              <div className="pt-4">
                <Button 
                  type="submit"
                  disabled={isProfileLoading || !isProfileValid}
                  className="w-full"
                >
                  {isProfileLoading ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {isOwner && (
          <>
            <Card>
              <CardHeader><CardTitle>Business Name</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={businessNameForm.handleSubmit} className="space-y-4">
                  <div>
                    <Label>Business Name</Label>
                    <Input 
                      value={businessNameForm.businessName} 
                      onChange={e => businessNameForm.setBusinessName(e.target.value)}
                      placeholder="Your business name"
                      required
                    />
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      type="submit"
                      disabled={businessNameForm.isLoading || !businessNameForm.isFormValid}
                      className="w-full"
                    >
                      {businessNameForm.isLoading ? 'Saving...' : 'Save Business Name'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Visual Branding</CardTitle></CardHeader>
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
                    const { error } = await authApi.invoke('connect-disconnect', { 
                      method: 'POST',
                      toast: { success: 'Disconnected from Stripe', error: 'Failed to disconnect' }
                    });
                    if (!error) window.location.reload();
                  } catch (e: any) {
                    console.error(e);
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
          </>
        )}


      </div>
    </AppLayout>;
}
