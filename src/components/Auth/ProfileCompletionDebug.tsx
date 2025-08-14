import { useUser } from '@clerk/clerk-react';
import { useProfile } from '@/queries/useProfile';
import { useOnboardingState } from '@/onboarding/streamlined';

/**
 * Debug component to show profile completion status
 */
export function ProfileCompletionDebug() {
  const { user } = useUser();
  const { data: profile } = useProfile();
  const onboarding = useOnboardingState();
  

  // Temporarily disabled
  return null;

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 text-xs max-w-md shadow-lg z-50">
      <h3 className="font-semibold mb-2">Profile Completion Debug</h3>
      
      <div className="space-y-1">
        <div>Clerk User: {user.firstName || user.fullName || 'No name'}</div>
        <div>DB Profile Name: {profile?.fullName || 'None'}</div>
        <div>DB Profile Phone: {profile?.phoneE164 || 'None'}</div>
        <div>DB Business Name: "{profile?.businessName || 'None'}"</div>
        <div>Business Name Valid: {profile?.businessName?.trim() ? 'Yes' : 'No'}</div>
        <div>Progress: {onboarding.completionPercentage}%</div>
        <div>Profile Complete: {onboarding.profileComplete ? '✅' : '❌'}</div>
        <div>Has Customers: {onboarding.hasCustomers ? '✅' : '❌'}</div>
        <div>Has Content: {onboarding.hasContent ? '✅' : '❌'}</div>
        <div>Bank Linked: {onboarding.bankLinked ? '✅' : '❌'}</div>
        <div>Subscribed: {onboarding.subscribed ? '✅' : '❌'}</div>
        <div>Next Action: {onboarding.nextAction || 'Complete!'}</div>
      </div>

      <div className="mt-2 pt-2 border-t">
        <div className="text-green-600">
          ✅ = {onboarding.completionPercentage >= 60 ? 'Should show green check' : 'Not complete yet'}
        </div>
      </div>
    </div>
  );
}