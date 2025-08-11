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
import { edgeFetchJson, edgeFetch } from '@/utils/edgeApi';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ConnectBanner from '@/components/Stripe/ConnectBanner';
import { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';
export default function SettingsPage() {
  const store = useStore();
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
  const {
    data: connectStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus
  } = useStripeConnectStatus({
    enabled: !!isSignedIn
  });
  const { user, isLoaded: userLoaded } = useUser();
  const [userName, setUserName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const saveUserName = async () => {
    if (!isSignedIn || !user) {
      toast.error('You must be signed in');
      return;
    }
    const name = userName.trim();
    if (!name) {
      toast.error('Please enter your name');
      return;
    }
    try {
      setSavingName(true);
      const parts = name.split(' ');
      const firstName = parts.shift() || '';
      const lastName = parts.join(' ');
      await user.update({ firstName, lastName });
      toast.success('Name updated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };
  async function uploadLogoDark() {
    if (!isSignedIn) {
      toast.error('You must be signed in');
      return;
    }
    if (!darkFile) {
      toast.error('Please choose an image file');
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
        toast.success('Dark icon updated');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to upload dark icon');
    } finally {
      setUploadingDark(false);
    }
  }
  async function uploadLogoLight() {
    if (!isSignedIn) {
      toast.error('You must be signed in');
      return;
    }
    if (!lightFile) {
      toast.error('Please choose an image file');
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
        toast.success('Light icon updated');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to upload light icon');
    } finally {
      setUploadingLight(false);
    }
  }
  async function refreshSubscription() {
    try {
      setSubLoading(true);
      const data = await edgeFetchJson('check-subscription', getToken, {
        method: 'POST'
      });
      setSub(data || null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to refresh subscription');
    } finally {
      setSubLoading(false);
    }
  }
  async function startCheckout(plan: 'monthly' | 'yearly') {
    try {
      const data = await edgeFetchJson('create-checkout', getToken, {
        method: 'POST',
        body: {
          plan
        }
      });
      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error('No checkout URL');
      window.open(url, '_blank');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start checkout');
    }
  }
  async function openPortal() {
    try {
      const data = await edgeFetchJson('customer-portal', getToken, {
        method: 'POST'
      });
      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error('No portal URL');
      window.open(url, '_blank');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to open portal');
    }
  }
  async function handleStripeConnect() {
    try {
      const data = await edgeFetchJson('connect-onboarding-link', getToken, {
        method: 'POST'
      });
      const url = (data as any)?.url as string | undefined;
      if (url) window.open(url, '_blank');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start Stripe onboarding');
    }
  }
  useEffect(() => {
    if (userLoaded) {
      setUserName(user?.fullName || '');
    }
  }, [userLoaded, user]);
  useEffect(() => {
    // Hydrate business from server to ensure persistence across devices
    if (!isSignedIn) return;
    (async () => {
      try {
        const data = await edgeFetchJson('get-business', getToken);
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
        <Card>
          <CardHeader><CardTitle>Business Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Name</Label>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your name" />
                <Button onClick={saveUserName} disabled={!userLoaded || savingName || userName.trim().length === 0 || userName === (user?.fullName ?? '')}>{savingName ? 'Saving…' : 'Save'}</Button>
              </div>
            </div>
            <div>
              <Label>Business Name</Label>
              <Input value={store.business.name} onChange={e => store.setBusiness({
              name: e.target.value
            })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={store.business.phone} onChange={e => store.setBusiness({
              phone: e.target.value
            })} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Dark Icon</Label>
              <div className="flex items-center gap-4">
                <div className="shrink-0 rounded-lg bg-background p-2 border border-border shadow-sm -ml-1">
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
              <div className="shrink-0 rounded-lg bg-primary p-2 shadow-sm -ml-1">
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

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Payouts</CardTitle></CardHeader>
          <CardContent>
            <ConnectBanner loading={!!statusLoading} error={statusError ? statusError.message : null} chargesEnabled={connectStatus?.chargesEnabled} payoutsEnabled={connectStatus?.payoutsEnabled} detailsSubmitted={connectStatus?.detailsSubmitted} bankLast4={connectStatus?.bank?.last4 ?? null} scheduleText={connectStatus?.schedule ? `${connectStatus.schedule.interval}${connectStatus.schedule.delay_days ? `, +${connectStatus.schedule.delay_days} days` : ""}` : null} onConnect={handleStripeConnect} onRefresh={() => refetchStatus()} onDisconnect={async () => {
              try {
                await edgeFetchJson('connect-disconnect', getToken, { method: 'POST' });
                await refetchStatus();
                toast.success('Disconnected from Stripe');
              } catch (e: any) {
                toast.error(e?.message || 'Failed to disconnect');
              }
            }} />
          </CardContent>
        </Card>

      </div>
    </AppLayout>;
}