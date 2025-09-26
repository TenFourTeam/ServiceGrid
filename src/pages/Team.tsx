import { MyBusinessTeamSection } from "@/components/Team/MyBusinessTeamSection";
import { BusinessesMembershipSection } from "@/components/Team/BusinessesMembershipSection";
import { WorkerLimitedAccess } from "@/components/Layout/WorkerLimitedAccess";
import { useSelectedBusiness } from "@/hooks/useSelectedBusiness";
import AppLayout from '@/components/Layout/AppLayout';
import { useLanguage } from "@/contexts/LanguageContext";

export default function Team() {
  const { selectedBusiness, canManage } = useSelectedBusiness();
  const { t } = useLanguage();

  return (
    <AppLayout title={t('team.title')}>
      <div className="space-y-6">
        {!canManage && <WorkerLimitedAccess />}

        {/* My Business Team - Primary business management */}
        <MyBusinessTeamSection />

        {/* External Memberships - Worker businesses and pending invites */}
        <BusinessesMembershipSection />
      </div>
    </AppLayout>
  );
}