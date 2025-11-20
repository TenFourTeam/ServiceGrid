import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuickBooksSync } from '@/hooks/useQuickBooksSync';
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export function QuickBooksSyncPanel() {
  const { isConnected } = useQuickBooksConnection();
  const { sync, isLoading } = useQuickBooksSync();

  if (!isConnected) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => sync({ type: 'customer', direction: 'to_qb' })}
            disabled={isLoading}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Customers → QB
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sync({ type: 'customer', direction: 'from_qb' })}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Customers ← QB
          </Button>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => sync({ type: 'invoice', direction: 'to_qb' })}
          disabled={isLoading}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Send Invoices to QuickBooks
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => sync({ type: 'payment', direction: 'to_qb' })}
          disabled={isLoading}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Send Payments to QuickBooks
        </Button>
      </CardContent>
    </Card>
  );
}
