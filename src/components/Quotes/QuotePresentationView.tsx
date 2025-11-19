import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ESignatureCanvas } from './ESignatureCanvas';
import { formatMoney } from '@/utils/format';
import { CheckCircle2, XCircle, MapPin, Calendar } from 'lucide-react';
import type { Quote } from '@/types';

interface QuotePresentationViewProps {
  quote: Quote;
  customerName?: string;
  businessName: string;
  businessLogo?: string;
  onAccept: (signature: string) => Promise<void>;
  onDecline: () => Promise<void>;
}

export function QuotePresentationView({
  quote,
  customerName,
  businessName,
  businessLogo,
  onAccept,
  onDecline
}: QuotePresentationViewProps) {
  const [showSignature, setShowSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async (signatureDataUrl: string) => {
    setIsSubmitting(true);
    try {
      await onAccept(signatureDataUrl);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this quote?')) return;
    
    setIsSubmitting(true);
    try {
      await onDecline();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-20">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {businessLogo ? (
              <img src={businessLogo} alt={businessName} className="h-10 object-contain" />
            ) : (
              <h2 className="text-lg font-semibold">{businessName}</h2>
            )}
            <Badge variant="outline" className="text-lg px-3 py-1">
              {quote.number}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Customer Info */}
        {customerName && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Quote For</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-lg font-medium">{customerName}</div>
              {quote.address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{quote.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {new Date(quote.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Work Description */}
        {quote.terms && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Work Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed">{quote.terms}</p>
            </CardContent>
          </Card>
        )}

        {/* Line Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Services & Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quote.lineItems.map((item, index) => (
              <div key={item.id || index}>
                {index > 0 && <Separator className="my-3" />}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base">{item.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.qty} {item.unit || 'unit'}{item.qty > 1 ? 's' : ''} × {formatMoney(item.unitPrice)}
                    </div>
                  </div>
                  <div className="text-lg font-semibold whitespace-nowrap">
                    {formatMoney(item.lineTotal)}
                  </div>
                </div>
              </div>
            ))}

            <Separator className="my-4" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(quote.subtotal)}</span>
              </div>
              
              {quote.discount > 0 && (
                <div className="flex justify-between text-base text-green-600">
                  <span>Discount</span>
                  <span>-{formatMoney(quote.discount)}</span>
                </div>
              )}
              
              {quote.taxRate > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">Tax ({(quote.taxRate * 100).toFixed(1)}%)</span>
                  <span>{formatMoney(Math.round((quote.subtotal - quote.discount) * quote.taxRate))}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-2xl font-bold">
                <span>Total</span>
                <span className="text-primary">{formatMoney(quote.total)}</span>
              </div>

              {quote.depositRequired && quote.depositPercent && (
                <Alert>
                  <AlertDescription>
                    Deposit required: {formatMoney(Math.round(quote.total * (quote.depositPercent / 100)))} ({quote.depositPercent}%)
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        {!showSignature ? (
          <div className="space-y-3">
            <Button
              className="w-full h-14 text-lg"
              size="lg"
              onClick={() => setShowSignature(true)}
              disabled={isSubmitting}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Accept Quote
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleDecline}
              disabled={isSubmitting}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline Quote
            </Button>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Sign to Accept</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                By signing below, you agree to the terms and pricing outlined in this quote.
              </p>
              <ESignatureCanvas
                onSignatureComplete={handleAccept}
                onClear={() => setShowSignature(false)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
