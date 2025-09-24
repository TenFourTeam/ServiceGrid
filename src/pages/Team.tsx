import { useBusinessContext } from '@/hooks/useBusinessContext';
import { BusinessMembersList } from "@/components/Business/BusinessMembersList";
import { BusinessesMembershipSection } from "@/components/Team/BusinessesMembershipSection";
import { WorkerLimitedAccess } from "@/components/Layout/WorkerLimitedAccess";
import AppLayout from '@/components/Layout/AppLayout';
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
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
  const { t } = useLanguage();

  return (
    <AppLayout title={t('team.title')}>
      <div className="space-y-6">
        <WorkerLimitedAccess />

        {/* Businesses I'm a Member Of */}
        <BusinessesMembershipSection />

        {/* Current Business Team */}
        <BusinessMembersList 
          businessId={businessId || ''} 
        />
      </div>
    </AppLayout>
  );
}