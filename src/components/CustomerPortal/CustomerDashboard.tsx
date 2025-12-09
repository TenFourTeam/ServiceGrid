import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerJobData } from '@/hooks/useCustomerJobData';
import { 
  FinancialSummaryWidget, 
  ActionItemsWidget, 
  ProgressWidget, 
  ContactsWidget 
} from '@/components/CustomerPortal/widgets';

export function CustomerDashboard() {
  const navigate = useNavigate();
  const { customerDetails } = useCustomerAuth();
  const { data: jobData, isLoading, error } = useCustomerJobData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load dashboard data</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold">
          Welcome, {customerDetails?.name?.split(' ')[0] || 'there'}!
        </h2>
        <p className="text-muted-foreground">
          Here's an overview of your projects with{' '}
          <span className="font-medium text-foreground">
            {jobData?.business?.name || 'your contractor'}
          </span>
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {jobData?.financialSummary && (
            <FinancialSummaryWidget 
              summary={jobData.financialSummary}
              onPayNow={() => navigate('/portal/documents')}
            />
          )}
          
          {jobData?.actionItems && (
            <ActionItemsWidget 
              items={jobData.actionItems}
              onViewQuotes={() => navigate('/portal/documents')}
              onViewInvoices={() => navigate('/portal/documents')}
              onViewSchedule={() => navigate('/portal/schedule')}
            />
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {jobData && (
            <ProgressWidget 
              jobs={jobData.jobs}
              upcomingJobs={jobData.upcomingJobs}
            />
          )}
          
          {jobData?.business && (
            <ContactsWidget 
              business={jobData.business}
              teamMembers={jobData.teamMembers}
            />
          )}
        </div>
      </div>
    </div>
  );
}
