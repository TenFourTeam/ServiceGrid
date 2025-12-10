import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerJobData } from '@/hooks/useCustomerJobData';
import { 
  FinancialSummaryWidget, 
  ActionItemsWidget, 
  ProgressWidget, 
  ContactsWidget 
} from '@/components/CustomerPortal/widgets';
import { buildEdgeFunctionUrl } from '@/utils/env';
import { toast } from 'sonner';

export function CustomerDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { customerDetails } = useCustomerAuth();
  const { data: jobData, isLoading, error, refetch } = useCustomerJobData();

  // Handle payment completion callback
  useEffect(() => {
    const paymentStatus = searchParams.get('payment_status');
    const sessionId = searchParams.get('session_id');

    if (paymentStatus === 'complete' && sessionId) {
      // Verify and record the payment
      const verifyPayment = async () => {
        try {
          const response = await fetch(
            buildEdgeFunctionUrl('payments-crud', { action: 'verify_payment' }),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: sessionId }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.status === 'paid') {
              toast.success('Payment confirmed! Thank you.');
              refetch(); // Refresh data to show updated invoice status
            }
          }
        } catch (error) {
          console.error('Payment verification error:', error);
        }
      };

      verifyPayment();
      
      // Clean URL params
      searchParams.delete('payment_status');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refetch]);

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
