import { useBusiness } from '@/queries/unified';
import { useBusinessContext } from '@/auth';

import { BusinessMembersList } from "@/components/Business/BusinessMembersList";
import { Navigate } from "react-router-dom";

export default function Team() {
  const { data: business } = useBusiness();
  const { role, isLoadingBusiness } = useBusinessContext();

  // Only owners can access the Team page
  if (!isLoadingBusiness && role !== 'owner') {
    return <Navigate to="/calendar" replace />;
  }

  if (isLoadingBusiness) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BusinessMembersList 
        businessId={business?.id || ''} 
        canManage={role === 'owner'} 
      />
    </div>
  );
}