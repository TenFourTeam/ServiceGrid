import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { getClerkTokenStrict } from '@/utils/clerkToken';
import { toast } from 'sonner';


export default function SettingsPage() {
  const store = useStore();
  const { getToken, isSignedIn } = useClerkAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadLogo() {
    if (!isSignedIn) {
      toast.error('You must be signed in');
      return;
    }
    if (!file) {
      toast.error('Please choose an image file');
      return;
    }
    try {
      setUploading(true);
      const token = await getClerkTokenStrict(getToken);
      const form = new FormData();
      form.append('file', file);
      const r = await fetch('https://ijudkzqfriazabiosnvb.functions.supabase.co/upload-business-logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `Upload failed (${r.status})`);
      const url = data?.url as string;
      if (url) {
        store.setBusiness({ logoUrl: url });
        toast.success('Logo updated');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  }

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
            <div>
              <Label>Default Tax Rate</Label>
              <Input type="number" step="0.01" value={store.business.taxRateDefault} onChange={(e)=>store.setBusiness({ taxRateDefault: Number(e.target.value) })} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {store.business.logoUrl ? (
                <img
                  src={store.business.logoUrl}
                  alt={`${store.business.name} logo`}
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary" aria-hidden />
              )}
              <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input type="file" accept="image/*" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
                <Button onClick={uploadLogo} disabled={uploading || !file}>{uploading ? 'Uploading…' : 'Upload logo'}</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Use a square image (PNG/SVG/WebP) for best results. This appears in the sidebar and emails.</p>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
