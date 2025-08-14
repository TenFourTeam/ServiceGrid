import { useBusinessRole } from "@/hooks/useBusinessRole";
import { useBusiness } from '@/queries/unified';

import { BusinessMembersList } from "@/components/Business/BusinessMembersList";
import { Navigate } from "react-router-dom";

export default function Team() {
  const { data: business } = useBusiness();
  const { data: businessRole, isLoading } = useBusinessRole(business?.id || '');

  // Only owners can access the Team page
  if (!isLoading && businessRole?.role !== 'owner') {
    return <Navigate to="/calendar" replace />;
  }

  if (isLoading) {
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
        canManage={businessRole?.role === 'owner'} 
      />
    </div>
  );
}