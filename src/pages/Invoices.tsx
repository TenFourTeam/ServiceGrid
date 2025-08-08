import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney } from '@/utils/format';
import { useState } from 'react';

export default function InvoicesPage() {
  const store = useStore();
  const [processing, setProcessing] = useState<string | null>(null);

  function send(id: string) { store.sendInvoice(id); }

  return (
    <AppLayout title="Invoices">
      <Card>
        <CardHeader><CardTitle>All Invoices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.invoices.map((i)=> (
                <TableRow key={i.id}>
                  <TableCell>{i.number}</TableCell>
                  <TableCell>{store.customers.find(c=>c.id===i.customerId)?.name}</TableCell>
                  <TableCell>{formatMoney(i.total)}</TableCell>
                  <TableCell>{formatDate(i.dueAt)}</TableCell>
                  <TableCell>{i.status}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {i.status==='Draft' && <Button onClick={()=>send(i.id)}>Send</Button>}
                      {i.status==='Sent' && <Button onClick={()=>{ setProcessing(i.id); setTimeout(()=>{ store.markInvoicePaid(i.id, '4242'); setProcessing(null); }, 800); }}>Mark Paid (Fake)</Button>}
                      {processing===i.id && <span className="text-sm text-muted-foreground">Processing…</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
