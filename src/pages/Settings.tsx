import AppLayout from '@/components/Layout/AppLayout';
import { RequireRole } from '@/components/Auth/RequireRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BusinessLogo from '@/components/BusinessLogo';
import { useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuthApi } from '@/hooks/useAuthApi';
import ConnectBanner from '@/components/Stripe/ConnectBanner';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useLogoOperations } from '@/hooks/useLogoOperations';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { useBusinessDetailsForm } from '@/hooks/useBusinessDetailsForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { BusinessConstraintsSettings } from '@/components/Settings/BusinessConstraintsSettings';
import { ServiceCatalogManager } from '@/components/Settings/ServiceCatalogManager';

export default function SettingsPage() {
  const { business, role } = useBusinessContext();
  const { isSignedIn } = useClerkAuth();
  const { t, language, setLanguage } = useLanguage();
  const authApi = useAuthApi();
  const [darkFile, setDarkFile] = useState<File | null>(null);
  const [lightFile, setLightFile] = useState<File | null>(null);
  const { status: connectStatus, isLoading: statusLoading, getOnboardingLink, disconnect } = useStripeConnect();
  const { status: subscription, isLoading: subLoading, createCheckout, getPortalLink } = useSubscriptions();
  const { uploadLogo, isUploading: isUploadingLogo } = useLogoOperations();
  
  // Profile form state management
  const {
    userName,
    setUserName,
    userPhone,
    setUserPhone,
    isFormValid: isProfileValid,
    isLoading: isProfileLoading,
    userNameSuggestion,
    shouldShowUserNameSuggestion,
    applySuggestion,
    handleSubmit: handleProfileSubmit,
  } = useSettingsForm();
  
  // Business details form state management
  const businessDetailsForm = useBusinessDetailsForm();
  function handleLogoUpload(kind: 'dark' | 'light') {
    const file = kind === 'dark' ? darkFile : lightFile;
    if (!file) {
      return;
    }
    
    uploadLogo.mutate({ file, kind });
  }
  async function startCheckout(plan: 'monthly' | 'yearly') {
    try {
      const url = await createCheckout.mutateAsync(plan);
      if (url) window.open(url, '_blank');
    } catch (e: Error | unknown) {
      console.error('[startCheckout] error:', e);
    }
  }
  
  async function openPortal() {
    try {
      const url = await getPortalLink.mutateAsync();
      if (url) window.open(url, '_blank');
    } catch (e: any) {
      console.error('[openPortal] error:', e);
    }
  }
  
  async function handleStripeConnect() {
    try {
      const url = await getOnboardingLink.mutateAsync();
      if (url) window.open(url, '_blank');
    } catch (e: any) {
      console.error('[handleStripeConnect] error:', e);
    }
  }
  const isOwner = role === 'owner';
  const pageTitle = isOwner ? t('settings.title') : t('settings.profile.title');
  
  return <AppLayout title={pageTitle}>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.profile.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <Label>{t('settings.profile.name')}</Label>
                <div className="space-y-2">
                  <Input 
                    value={userName} 
                    onChange={e => setUserName(e.target.value)} 
                    placeholder={t('settings.profile.namePlaceholder')} 
                    required
                  />
                  {shouldShowUserNameSuggestion && (
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                      onClick={applySuggestion}
                    >
                      ✨ Use "{userNameSuggestion}"
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>{t('settings.profile.phone')}</Label>
                <Input 
                  value={userPhone}
                  onChange={e => setUserPhone(e.target.value)}
                  placeholder={t('settings.profile.phonePlaceholder')}
                  type="tel"
                  required
                />
              </div>
              
              <div className="pt-4">
                <Button 
                  type="submit"
                  disabled={isProfileLoading || !isProfileValid}
                  className="w-full"
                >
                  {isProfileLoading ? t('common.loading') : t('common.save') + ' ' + t('settings.profile.title')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('settings.language.description')}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.language.english')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('settings.language.english')}</SelectItem>
                  <SelectItem value="es">{t('settings.language.spanish')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <RequireRole role="owner" fallback={null}>
          <Card>
            <CardHeader><CardTitle>{t('settings.business.title')}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={businessDetailsForm.handleSubmit} className="space-y-4">
                <div>
                  <Label>{t('settings.business.name')}</Label>
                  <Input 
                    value={businessDetailsForm.businessName} 
                    onChange={e => businessDetailsForm.setBusinessName(e.target.value)}
                    placeholder={t('settings.business.namePlaceholder')}
                    required
                  />
                </div>
                
                <div>
                  <Label>{t('settings.business.description')}</Label>
                  <Textarea 
                    value={businessDetailsForm.businessDescription} 
                    onChange={e => businessDetailsForm.setBusinessDescription(e.target.value)}
                    placeholder={t('settings.business.descriptionPlaceholder')}
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    This will appear as the description when your links are shared
                  </p>
                </div>
                
                <div className="pt-4">
                  <Button 
                    type="submit"
                    disabled={businessDetailsForm.isLoading || !businessDetailsForm.isFormValid}
                    className="w-full"
                  >
                    {businessDetailsForm.isLoading ? t('common.loading') : t('common.save') + ' ' + t('settings.business.title')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Service Catalog - only for owners */}
          {role === 'owner' && (
            <ServiceCatalogManager />
          )}

          <Card>
            <CardHeader><CardTitle>{t('settings.branding.title')}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>{t('settings.branding.darkLogo')}</Label>
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-14 h-14 rounded-lg bg-background p-2 border border-border shadow-sm -ml-1 flex items-center justify-center overflow-hidden">
                      <BusinessLogo size={40} src={business?.logoUrl as string} alt="Dark icon preview" />
                    </div>
                    <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={e => setDarkFile(e.target.files?.[0] || null)} />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button onClick={() => handleLogoUpload('dark')} disabled={isUploadingLogo || !darkFile}>{isUploadingLogo ? t('common.loading') : t('settings.branding.uploadLogo')}</Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          Used across the app (sidebar, headers). Use PNG/SVG/WebP. Recommended size: 32x32.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('settings.branding.lightLogo')}</Label>
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-14 h-14 rounded-lg bg-primary p-2 shadow-sm -ml-1 flex items-center justify-center overflow-hidden">
                      <BusinessLogo size={40} src={business?.lightLogoUrl as string} alt="Light icon preview" />
                    </div>
                    <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={e => setLightFile(e.target.files?.[0] || null)} />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button onClick={() => handleLogoUpload('light')} disabled={isUploadingLogo || !lightFile}>{isUploadingLogo ? t('common.loading') : t('settings.branding.uploadLogo')}</Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          Used in emails and email previews. Use a white/light version. Use PNG/SVG/WebP. Recommended size: 32x32.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scheduling Rules</CardTitle>
              <p className="text-sm text-muted-foreground">Configure automated scheduling constraints</p>
            </CardHeader>
            <CardContent>
              <BusinessConstraintsSettings />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.subscription.payouts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ConnectBanner
                loading={statusLoading} 
                error={null} 
                chargesEnabled={connectStatus?.chargesEnabled} 
                payoutsEnabled={connectStatus?.payoutsEnabled} 
                detailsSubmitted={connectStatus?.detailsSubmitted} 
                bankLast4={null} 
                scheduleText={null} 
                onConnect={handleStripeConnect} 
                onRefresh={() => window.location.reload()} 
                onDisconnect={async () => {
                try {
                  const { error } = await authApi.invoke('connect-disconnect', { 
                    method: 'POST',
                    toast: { success: 'Disconnected from Stripe', error: 'Failed to disconnect' }
                  });
                  if (!error) window.location.reload();
                        } catch (e: Error | unknown) {
                          console.error(e);
                }
              }} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="text-sm">{subscription?.subscribed ? `Active • ${subscription?.subscription_tier || ''}` : 'Not subscribed'}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => startCheckout('monthly')}>Start Monthly ($50)</Button>
                <Button size="sm" onClick={() => startCheckout('yearly')}>Start Yearly ($504)</Button>
                <Button size="sm" variant="secondary" onClick={openPortal}>Manage Subscription</Button>
              </div>
            </CardContent>
          </Card>
        </RequireRole>


      </div>
    </AppLayout>;
}
