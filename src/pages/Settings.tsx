import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { exportJSON, importJSON, resetStorage } from '@/store/storage';

export default function SettingsPage() {
  const store = useStore();

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
              <Label>Reply-to Email</Label>
              <Input value={store.business.replyToEmail} onChange={(e)=>store.setBusiness({ replyToEmail: e.target.value })} />
            </div>
            <div>
              <Label>Default Tax Rate</Label>
              <Input type="number" step="0.01" value={store.business.taxRateDefault} onChange={(e)=>store.setBusiness({ taxRateDefault: Number(e.target.value) })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Numbering</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estimate Prefix</Label>
              <Input value={store.business.numbering.estPrefix} onChange={(e)=>store.setBusiness({ numbering: { ...store.business.numbering, estPrefix: e.target.value } as any })} />
            </div>
            <div>
              <Label>Estimate Seq</Label>
              <Input type="number" value={store.business.numbering.estSeq} onChange={(e)=>store.setBusiness({ numbering: { ...store.business.numbering, estSeq: Number(e.target.value) } as any })} />
            </div>
            <div>
              <Label>Invoice Prefix</Label>
              <Input value={store.business.numbering.invPrefix} onChange={(e)=>store.setBusiness({ numbering: { ...store.business.numbering, invPrefix: e.target.value } as any })} />
            </div>
            <div>
              <Label>Invoice Seq</Label>
              <Input type="number" value={store.business.numbering.invSeq} onChange={(e)=>store.setBusiness({ numbering: { ...store.business.numbering, invSeq: Number(e.target.value) } as any })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Data</CardTitle></CardHeader>
          <CardContent className="space-x-2">
            <Button onClick={()=>store.seedDemo()}>Load Demo Data</Button>
            <Button variant="secondary" onClick={()=>exportJSON(store)}>Export JSON</Button>
            <Button variant="secondary" onClick={async ()=>{ const data = await importJSON<any>(); if (data) store.overwriteState(data); }}>Import JSON</Button>
            <Button variant="destructive" onClick={()=>{ resetStorage(); window.location.reload(); }}>Reset All</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
