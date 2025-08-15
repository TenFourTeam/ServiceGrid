import { useBusinessContext } from '@/hooks/useBusinessContext';
import { BusinessMembersList } from "@/components/Business/BusinessMembersList";

export default function Team() {
  const { businessId } = useBusinessContext();

  return (
    <div className="space-y-6">
      <BusinessMembersList 
        businessId={businessId || ''} 
      />
    </div>
  );
}