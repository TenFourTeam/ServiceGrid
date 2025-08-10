import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import BusinessLogo from '@/components/BusinessLogo';
import { useState, useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { getClerkTokenStrict } from '@/utils/clerkToken';
import { toast } from 'sonner';


export default function SettingsPage() {
  const store = useStore();
  const { getToken, isSignedIn } = useClerkAuth();
  const [darkFile, setDarkFile] = useState<File | null>(null);
  const [lightFile, setLightFile] = useState<File | null>(null);
  const [uploadingDark, setUploadingDark] = useState(false);
  const [uploadingLight, setUploadingLight] = useState(false);

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
      const token = await getClerkTokenStrict(getToken);
      const form = new FormData();
      form.append('file', darkFile);
      const r = await fetch('https://ijudkzqfriazabiosnvb.functions.supabase.co/upload-business-logo?kind=dark', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `Upload failed (${r.status})`);
      const url = data?.url as string;
      if (url) {
        store.setBusiness({ logoUrl: url });
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
      const token = await getClerkTokenStrict(getToken);
      const form = new FormData();
      form.append('file', lightFile);
      const r = await fetch('https://ijudkzqfriazabiosnvb.functions.supabase.co/upload-business-logo?kind=light', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `Upload failed (${r.status})`);
      const url = data?.url as string;
      if (url) {
        store.setBusiness({ lightLogoUrl: url });
        toast.success('Light icon updated');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to upload light icon');
    } finally {
      setUploadingLight(false);
    }
  }

  useEffect(() => {
    // Hydrate business from server to ensure persistence across devices
    if (!isSignedIn) return;
    (async () => {
      try {
        const token = await getClerkTokenStrict(getToken);
        const r = await fetch('https://ijudkzqfriazabiosnvb.functions.supabase.co/get-business', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || `Failed to load business (${r.status})`);
        const b = data?.business;
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
              invSeq: Number(b.inv_seq ?? store.business.numbering.invSeq) || store.business.numbering.invSeq,
            },
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [isSignedIn]);

  return (
    <AppLayout title="Settings">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Business Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={store.business.name} onChange={(e)=>store.setBusiness({ name: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={store.business.phone} onChange={(e)=>store.setBusiness({ phone: e.target.value })} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Dark Icon</Label>
              <div className="flex items-center gap-4">
                <BusinessLogo size={40} src={store.business.logoUrl} alt="Dark icon preview" />
                <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={(e)=>setDarkFile(e.target.files?.[0] || null)} />
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
                <Input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={(e)=>setLightFile(e.target.files?.[0] || null)} />
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

      </div>
    </AppLayout>
  );
}
