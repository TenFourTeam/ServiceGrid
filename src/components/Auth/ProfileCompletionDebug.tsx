import { useUser } from '@clerk/clerk-react';
import { useStore } from '@/store/useAppStore';
import { useProfile } from '@/queries/useProfile';
import { useOnboardingState } from '@/onboarding/useOnboardingState';

/**
 * Debug component to show profile completion status
 */
export function ProfileCompletionDebug() {
  const { user } = useUser();
  const { business } = useStore();
  const { data: profile } = useProfile();
  const onboarding = useOnboardingState();

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 text-xs max-w-md shadow-lg z-50">
      <h3 className="font-semibold mb-2">Profile Completion Debug</h3>
      
      <div className="space-y-1">
        <div>Clerk User: {user.firstName || user.fullName || 'No name'}</div>
        <div>DB Profile Name: {profile?.full_name || 'None'}</div>
        <div>DB Profile Phone: {profile?.phone_e164 || 'None'}</div>
        <div>DB Name Source: {(profile as any)?.name_source || 'None'}</div>
        <div>Local Business: {business?.name || 'None'}</div>
        <div>Business Name Customized: {business?.name_customized ? 'Yes' : 'No'}</div>
        <div>OnbCtx Business Customized: {onboarding.ctx.business.nameCustomized ? 'Yes' : 'No'}</div>
        <div>Current Step: {onboarding.currentStepId || 'Complete'}</div>
        <div>Progress: {onboarding.progressPct}%</div>
        <div>Profile Complete: {onboarding.completionByStep.profile ? '✅' : '❌'}</div>
        <div>Next Action: {onboarding.nextAction}</div>
      </div>

      <div className="mt-2 pt-2 border-t">
        <div className="text-green-600">
          ✅ = {onboarding.progressPct >= 60 ? 'Should show green check' : 'Not complete yet'}
        </div>
      </div>
    </div>
  );
}