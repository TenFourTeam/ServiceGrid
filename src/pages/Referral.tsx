import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import AppLayout from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, Share, Gift, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAppUrl } from '@/utils/env';

export default function ReferralPage() {
  const { user } = useUser();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  
  const referralLink = `${getAppUrl()}/invite/referral?ref=${user?.id || 'user'}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success(t('referral.messages.linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success(t('referral.messages.linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppLayout title={t('referral.title')}>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Hero Card */}
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {t('referral.hero.mainTitle')}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {t('referral.hero.subtitle')}
            </p>
          </CardHeader>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>{t('referral.howItWorks.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Share className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">{t('referral.howItWorks.steps.share.title')}</h4>
                <p className="text-sm text-muted-foreground">{t('referral.howItWorks.steps.share.description')}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">{t('referral.howItWorks.steps.signup.title')}</h4>
                <p className="text-sm text-muted-foreground">{t('referral.howItWorks.steps.signup.description')}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Gift className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">{t('referral.howItWorks.steps.reward.title')}</h4>
                <p className="text-sm text-muted-foreground">{t('referral.howItWorks.steps.reward.description')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card>
          <CardHeader>
            <CardTitle>{t('referral.referralLink.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={referralLink} 
                readOnly 
                className="font-mono text-xs"
              />
              <Button 
                onClick={handleCopyLink}
                size="sm"
                variant="outline"
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('referral.referralLink.description')}
            </p>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}