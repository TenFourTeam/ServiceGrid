import { useBusinessContext } from '@/hooks/useBusinessContext';
import { BusinessMembersList } from "@/components/Business/BusinessMembersList";
import { WorkerLimitedAccess } from "@/components/Layout/WorkerLimitedAccess";
import { useBusinessLeaving } from "@/hooks/useBusinessLeaving";
import AppLayout from '@/components/Layout/AppLayout';
import { Card } from "@/components/ui/card";
import { Building2, Users, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { leaveBusiness, isLeaving } = useBusinessLeaving();
  const { t } = useLanguage();
  const [leavingBusinessId, setLeavingBusinessId] = useState<string | null>(null);

  // Since we're going back to single-business model, remove business switching
  return (
    <AppLayout title={t('team.title')}>
      <div className="space-y-6">
        <WorkerLimitedAccess />

        {/* Current Business Team */}
        <BusinessMembersList 
          businessId={businessId || ''} 
        />
      </div>
    </AppLayout>
  );
}