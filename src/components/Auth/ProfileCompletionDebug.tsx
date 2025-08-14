import { useUser } from '@clerk/clerk-react';
import { useStore } from '@/store/useAppStore';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useOnboardingState } from '@/onboarding/useOnboardingState';

/**
 * Debug component to show profile completion status
 */
export function ProfileCompletionDebug() {
  const { user } = useUser();
  const { business } = useStore();
  const { data: dashboardData } = useDashboardData();
  const onboarding = useOnboardingState();

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 text-xs max-w-md shadow-lg z-50">
      <h3 className="font-semibold mb-2">Profile Completion Debug</h3>
      
      <div className="space-y-1">
        <div>User: {user.firstName || user.fullName || 'No name'}</div>
        <div>Local Business: {business?.name || 'None'}</div>
        <div>Local Phone: {business?.phone || 'None'}</div>
        <div>Dashboard Business: {dashboardData?.business?.name || 'None'}</div>
        <div>Dashboard Phone: {dashboardData?.business?.phone || 'None'}</div>
        <div>Progress: {onboarding.progressPct}%</div>
        <div>Has Name & Business: {onboarding.hasNameAndBusiness ? '✅' : '❌'}</div>
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