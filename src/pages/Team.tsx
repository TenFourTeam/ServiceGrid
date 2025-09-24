import { useBusinessContext } from '@/hooks/useBusinessContext';
import { BusinessMembersList } from "@/components/Business/BusinessMembersList";
import { BusinessSwitcher } from "@/components/Team/BusinessSwitcher";
import { WorkerLimitedAccess } from "@/components/Layout/WorkerLimitedAccess";
import { useUserBusinesses } from "@/queries/useUserBusinesses";
import { useBusinessLeaving } from "@/hooks/useBusinessLeaving";
import AppLayout from '@/components/Layout/AppLayout';
import { Card } from "@/components/ui/card";
import { Building2, Users, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessSwitcher } from "@/hooks/useBusinessSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
  const [leavingBusinessId, setLeavingBusinessId] = useState<string | null>(null);

  const allBusinesses = businesses || [];

  const handleSwitchBusiness = (targetBusinessId: string) => {
    switchBusiness.mutate(targetBusinessId);
  };

  const handleLeaveBusiness = (businessIdToLeave: string) => {
    leaveBusiness.mutate({ businessId: businessIdToLeave }, {
      onSuccess: () => {
        setLeavingBusinessId(null);
      }
    });
  };

  return (
    <AppLayout title={t('team.title')}>
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
              {t('team.allMemberships')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('team.allMembershipsDescription')}
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
                        {t('team.joined')} {new Date(business.joined_at).toLocaleDateString()}
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
                        {t('team.current')}
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
                        {t('team.switch')}
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
                            {t('team.leave')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('team.leaveDialog.title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('team.leaveDialog.description', { businessName: business.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('team.leaveDialog.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleLeaveBusiness(business.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t('team.leaveDialog.confirm')}
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
                {t('team.emptyStates.noOtherTeams')}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('team.emptyStates.noOtherTeamsDescription')}
              </p>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}