import { useBusinessContext } from '@/hooks/useBusinessContext';
import { BusinessMembersList } from "@/components/Business/BusinessMembersList";
import { BusinessSwitcher } from "@/components/Team/BusinessSwitcher";
import { useUserBusinesses } from "@/hooks/useUserBusinesses";
import AppLayout from '@/components/Layout/AppLayout';
import { Card } from "@/components/ui/card";
import { Building2, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessSwitcher } from "@/hooks/useBusinessSwitcher";

export default function Team() {
  const { businessId, businessName } = useBusinessContext();
  const { data: businesses } = useUserBusinesses();
  const { switchBusiness } = useBusinessSwitcher();

  const otherBusinesses = businesses?.filter(b => !b.is_current) || [];

  const handleSwitchBusiness = async (targetBusinessId: string) => {
    try {
      await switchBusiness.mutateAsync(targetBusinessId);
    } catch (error) {
      console.error('Failed to switch business:', error);
    }
  };

  return (
    <AppLayout title="Team Management">
      <div className="space-y-6">
        {/* Business Switcher (if user has multiple businesses) */}
        {businesses && businesses.length > 1 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Switch Business
                </h3>
                <p className="text-sm text-muted-foreground">
                  Currently managing: <span className="font-medium">{businessName}</span>
                </p>
              </div>
              <BusinessSwitcher />
            </div>
          </Card>
        )}

        {/* Current Business Team */}
        <BusinessMembersList 
          businessId={businessId || ''} 
        />

        {/* Teams I'm a member of */}
        {otherBusinesses.length > 0 && (
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teams I'm a Member Of
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Other businesses where you're a team member
              </p>
            </div>

            <div className="grid gap-3">
              {otherBusinesses.map((business) => (
                <div
                  key={business.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{business.name}</span>
                        <span className="text-sm text-muted-foreground">
                          • {business.role}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Joined {new Date(business.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSwitchBusiness(business.id)}
                    className="flex items-center gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Switch
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}