import { useState, useEffect } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, Share, Gift, Copy, Check, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAppUrl } from '@/utils/env';
import { useReferralStats } from '@/hooks/useReferralStats';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useProfile } from '@/queries/useProfile';

export default function ReferralPage() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const { data: stats, isLoading } = useReferralStats();
  const { data: profileData } = useProfile();
  const authApi = useAuthApi();
  
  const referralLink = `${getAppUrl()}/invite/referral?ref=${profileData?.profile?.id || ''}`;

  // Initialize referral code on mount
  useEffect(() => {
    if (profileData?.profile?.id) {
      authApi.invoke('create-referral-code', {
        method: 'POST'
      }).catch(error => {
        console.error('Failed to initialize referral code:', error);
      });
    }
  }, [profileData?.profile?.id, authApi]);
  
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

        {/* Referral Stats */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Your Referral Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-primary">
                    {stats?.total_clicks || 0}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Link Clicks
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-primary">
                    {stats?.total_signups || 0}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Successful Signups
                  </div>
                </div>
              </div>
            )}

            {stats && stats.referrals && stats.referrals.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Recent Referrals
                </h4>
                <div className="space-y-2">
                  {stats.referrals.slice(0, 5).map((referral) => (
                    <div 
                      key={referral.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {referral.referred_email || 'Pending signup'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        referral.status === 'completed' 
                          ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                          : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {referral.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}