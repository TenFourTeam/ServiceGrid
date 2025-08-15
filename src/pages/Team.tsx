import { useBusiness } from '@/queries/unified';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { BusinessMembersList } from "@/components/Business/BusinessMembersList";

export default function Team() {
  const { data: business } = useBusiness();
  const { role } = useBusinessContext();

  return (
    <div className="space-y-6">
      <BusinessMembersList 
        businessId={business?.id || ''} 
        canManage={role === 'owner'} 
      />
    </div>
  );
}