import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


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
              <Label>Default Tax Rate</Label>
              <Input type="number" step="0.01" value={store.business.taxRateDefault} onChange={(e)=>store.setBusiness({ taxRateDefault: Number(e.target.value) })} />
            </div>
          </CardContent>
        </Card>


      </div>
    </AppLayout>
  );
}
