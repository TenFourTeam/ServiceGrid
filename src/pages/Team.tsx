import { useBusinessContext } from '@/hooks/useBusinessContext';
import { BusinessMembersList } from "@/components/Business/BusinessMembersList";
import AppLayout from '@/components/Layout/AppLayout';

export default function Team() {
  const { businessId } = useBusinessContext();

  return (
    <AppLayout title="Team Management">
      <div className="space-y-6">
        <BusinessMembersList 
          businessId={businessId || ''} 
        />
      </div>
    </AppLayout>
  );
}