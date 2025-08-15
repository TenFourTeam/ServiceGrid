import { useBusiness } from '@/queries/unified';
import { BusinessMembersList } from "@/components/Business/BusinessMembersList";

export default function Team() {
  const { data: business } = useBusiness();

  return (
    <div className="space-y-6">
      <BusinessMembersList 
        businessId={business?.id || ''} 
      />
    </div>
  );
}