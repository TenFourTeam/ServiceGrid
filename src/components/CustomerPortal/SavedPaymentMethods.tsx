import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreditCard, Trash2, Loader2 } from 'lucide-react';
import { useCustomerPaymentMethods, SavedPaymentMethod } from '@/hooks/useCustomerPaymentMethods';
import { cn } from '@/lib/utils';

// Card brand colors/icons
const cardBrandConfig: Record<string, { color: string; label: string }> = {
  visa: { color: 'text-blue-600', label: 'Visa' },
  mastercard: { color: 'text-orange-600', label: 'Mastercard' },
  amex: { color: 'text-blue-500', label: 'American Express' },
  discover: { color: 'text-orange-500', label: 'Discover' },
  unknown: { color: 'text-muted-foreground', label: 'Card' },
};

function PaymentMethodCard({ 
  method, 
  onDelete, 
  isDeleting 
}: { 
  method: SavedPaymentMethod; 
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const brandConfig = cardBrandConfig[method.brand.toLowerCase()] || cardBrandConfig.unknown;
  const isExpired = new Date(method.expYear, method.expMonth - 1) < new Date();

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={cn("p-2 rounded-md bg-muted", brandConfig.color)}>
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{brandConfig.label}</span>
            <span className="text-muted-foreground">•••• {method.last4}</span>
            {isExpired && (
              <Badge variant="destructive" className="text-xs">Expired</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Expires {method.expMonth.toString().padStart(2, '0')}/{method.expYear}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={isDeleting}
        className="text-muted-foreground hover:text-destructive"
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function SavedPaymentMethods() {
  const { paymentMethods, isLoading, deletePaymentMethod } = useCustomerPaymentMethods();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SavedPaymentMethod | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    
    setDeletingId(confirmDelete.id);
    try {
      await deletePaymentMethod.mutateAsync(confirmDelete.id);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (paymentMethods.length === 0) {
    return null; // Don't show card if no payment methods
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Saved Payment Methods
          </CardTitle>
          <CardDescription>
            Manage your saved cards for faster checkout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              onDelete={() => setConfirmDelete(method)}
              isDeleting={deletingId === method.id}
            />
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the {cardBrandConfig[confirmDelete?.brand?.toLowerCase() || 'unknown'].label} card 
              ending in {confirmDelete?.last4} from your account. You can always add it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
