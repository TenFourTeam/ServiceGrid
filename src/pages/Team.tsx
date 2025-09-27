import { MyBusinessTeamSection } from "@/components/Team/MyBusinessTeamSection";
import AppLayout from '@/components/Layout/AppLayout';
import { useLanguage } from "@/contexts/LanguageContext";

export default function Team() {
  const { t } = useLanguage();

  return (
    <AppLayout title={t('team.title')}>
      <div className="space-y-6">
        {/* Single Business Team Management */}
        <MyBusinessTeamSection />
      </div>
    </AppLayout>
  );
}