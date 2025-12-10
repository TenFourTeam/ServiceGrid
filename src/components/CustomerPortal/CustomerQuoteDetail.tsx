import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ESignatureCanvas } from '@/components/Quotes/ESignatureCanvas';
import { 
  useCustomerQuoteDetail, 
  useAcceptQuote, 
  useDeclineQuote, 
  useRequestQuoteChanges 
} from '@/hooks/useCustomerQuoteActions';
import { formatMoney } from '@/utils/format';
import { format } from 'date-fns';
import { 
  Loader2, CheckCircle2, XCircle, Edit3, MapPin, Calendar, 
  FileText, Download 
} from 'lucide-react';

interface CustomerQuoteDetailProps {
  quoteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerQuoteDetail({ quoteId, open, onOpenChange }: CustomerQuoteDetailProps) {
  const { data, isLoading, error } = useCustomerQuoteDetail(quoteId);
  const acceptQuote = useAcceptQuote();
  const declineQuote = useDeclineQuote();
  const requestChanges = useRequestQuoteChanges();

  const [mode, setMode] = useState<'view' | 'sign' | 'changes'>('view');
  const [changeNotes, setChangeNotes] = useState('');

  const handleAccept = async (signatureDataUrl: string) => {
    if (!quoteId) return;
    await acceptQuote.mutateAsync({ quoteId, signature: signatureDataUrl });
    setMode('view');
    onOpenChange(false);
  };

  const handleDecline = async () => {
    if (!quoteId) return;
    if (!confirm('Are you sure you want to decline this quote?')) return;
    await declineQuote.mutateAsync(quoteId);
    onOpenChange(false);
  };

  const handleRequestChanges = async () => {
    if (!quoteId || !changeNotes.trim()) return;
    await requestChanges.mutateAsync({ quoteId, notes: changeNotes });
    setChangeNotes('');
    setMode('view');
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'Declined': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'Edits Requested': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canTakeAction = data?.quote?.status === 'Sent';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Quote Details</span>
            {data?.quote && (
              <Badge className={getStatusColor(data.quote.status)}>
                {data.quote.status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load quote details</p>
          </div>
        )}

        {data?.quote && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {data.business.logo_url && (
                    <img 
                      src={data.business.logo_url} 
                      alt={data.business.name} 
                      className="h-8 object-contain" 
                    />
                  )}
                  <span className="text-lg font-semibold">{data.business.name}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Quote #{data.quote.number}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(data.quote.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            {/* Address */}
            {data.quote.address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{data.quote.address}</span>
              </div>
            )}

            {/* Terms / Work Description */}
            {data.quote.terms && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Work Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {data.quote.terms}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Line Items */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Services & Materials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.quote.quote_line_items
                  .sort((a, b) => a.position - b.position)
                  .map((item, index) => (
                    <div key={item.id}>
                      {index > 0 && <Separator className="my-3" />}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.qty} {item.unit || 'unit'}{item.qty > 1 ? 's' : ''} × {formatMoney(item.unit_price)}
                          </div>
                        </div>
                        <div className="font-semibold whitespace-nowrap">
                          {formatMoney(item.line_total)}
                        </div>
                      </div>
                    </div>
                  ))}

                <Separator className="my-4" />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatMoney(data.quote.subtotal)}</span>
                  </div>

                  {data.quote.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatMoney(data.quote.discount)}</span>
                    </div>
                  )}

                  {data.quote.tax_rate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Tax ({(data.quote.tax_rate * 100).toFixed(1)}%)
                      </span>
                      <span>
                        {formatMoney(Math.round((data.quote.subtotal - data.quote.discount) * data.quote.tax_rate))}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatMoney(data.quote.total)}</span>
                  </div>

                  {data.quote.deposit_required && data.quote.deposit_percent && (
                    <Alert>
                      <AlertDescription>
                        Deposit required: {formatMoney(Math.round(data.quote.total * (data.quote.deposit_percent / 100)))} ({data.quote.deposit_percent}%)
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Signature Section */}
            {mode === 'sign' && canTakeAction && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sign to Accept</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    By signing below, you agree to the terms and pricing outlined in this quote.
                  </p>
                  <ESignatureCanvas
                    onSignatureComplete={handleAccept}
                    onClear={() => setMode('view')}
                  />
                </CardContent>
              </Card>
            )}

            {/* Request Changes Section */}
            {mode === 'changes' && canTakeAction && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Request Changes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Describe the changes you'd like to request:
                  </p>
                  <Textarea
                    placeholder="Please describe what changes you need..."
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    rows={4}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setMode('view')}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleRequestChanges}
                      disabled={!changeNotes.trim() || requestChanges.isPending}
                    >
                      {requestChanges.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Submit Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {mode === 'view' && canTakeAction && (
              <div className="space-y-3">
                <Button
                  className="w-full h-12"
                  size="lg"
                  onClick={() => setMode('sign')}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Accept Quote
                </Button>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => setMode('changes')}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Request Changes
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={handleDecline}
                    disabled={declineQuote.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              </div>
            )}

            {/* Already actioned message */}
            {!canTakeAction && (
              <Alert>
                <AlertDescription>
                  {data.quote.status === 'Approved' && 'This quote has been accepted.'}
                  {data.quote.status === 'Declined' && 'This quote has been declined.'}
                  {data.quote.status === 'Edits Requested' && 'Changes have been requested. The business will review your request.'}
                  {data.quote.status === 'Draft' && 'This quote is still being prepared.'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
