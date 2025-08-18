import { useBusinessContext } from '@/hooks/useBusinessContext';
import { BusinessMembersList } from "@/components/Business/BusinessMembersList";
import { BusinessSwitcher } from "@/components/Team/BusinessSwitcher";
import { WorkerLimitedAccess } from "@/components/Layout/WorkerLimitedAccess";
import { useUserBusinesses } from "@/hooks/useUserBusinesses";
import { useBusinessLeaving } from "@/hooks/useBusinessLeaving";
import AppLayout from '@/components/Layout/AppLayout';
import { Card } from "@/components/ui/card";
import { Building2, Users, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessSwitcher } from "@/hooks/useBusinessSwitcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function Team() {
  const { businessId, businessName, role } = useBusinessContext();
  const { data: businesses } = useUserBusinesses();
  const { switchBusiness } = useBusinessSwitcher();
  const { leaveBusiness, isLeaving } = useBusinessLeaving();
  const [leavingBusinessId, setLeavingBusinessId] = useState<string | null>(null);

  const allBusinesses = businesses || [];

  const handleSwitchBusiness = async (targetBusinessId: string) => {
    try {
      await switchBusiness.mutateAsync(targetBusinessId);
    } catch (error) {
      console.error('Failed to switch business:', error);
    }
  };

  const handleLeaveBusiness = async (businessIdToLeave: string) => {
    try {
      await leaveBusiness.mutateAsync({ businessId: businessIdToLeave });
      setLeavingBusinessId(null);
    } catch (error) {
      console.error('Failed to leave business:', error);
    }
  };

  return (
    <AppLayout title="Team Management">
      <div className="space-y-6">
        <WorkerLimitedAccess />

        {/* Current Business Team */}
        <BusinessMembersList 
          businessId={businessId || ''} 
        />

        {/* Teams I'm a member of */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              All My Business Memberships
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              All businesses where you're a team member
            </p>
          </div>

          {allBusinesses.length > 0 ? (
            <div className="grid gap-3">
              {allBusinesses.map((business) => (
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
                  
                  <div className="flex items-center gap-2">
                    {business.is_current ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="flex items-center gap-2"
                      >
                        Current
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSwitchBusiness(business.id)}
                        className="flex items-center gap-2"
                        disabled={switchBusiness.isPending}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Switch
                      </Button>
                    )}
                    
                    {business.role !== 'owner' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-destructive hover:text-destructive"
                            disabled={isLeaving}
                          >
                            <LogOut className="h-4 w-4" />
                            Leave
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Leave Business</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to leave <strong>{business.name}</strong>? 
                              You will lose access to this business workspace and all its data.
                              You can only rejoin if invited again by the business owner.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleLeaveBusiness(business.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Leave Business
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2">
                You're not a member of any other teams yet
              </div>
              <p className="text-sm text-muted-foreground">
                You'll see other businesses here when you get invited to join them
              </p>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}