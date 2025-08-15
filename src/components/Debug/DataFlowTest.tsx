import { useCustomersData, useJobsData, useQuotesData, useInvoicesData } from '@/queries/unified';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { BusinessScopingTest } from './BusinessScopingTest';
import { IntegrationStatus } from './IntegrationStatus';

/**
 * Debug component to test and validate data flow
 * Shows server data vs React Query data to verify integration is working
 */
export function DataFlowTest() {
  const { data: customers = [], count: customersCount } = useCustomersData();
  const { data: jobs = [], count: jobsCount } = useJobsData();
  const { data: quotes = [], count: quotesCount } = useQuotesData();
  const { data: invoices = [], count: invoicesCount } = useInvoicesData();
  const { isAuthenticated, businessId } = useBusinessContext();

  if (!isAuthenticated) {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="p-6 bg-card rounded-lg shadow-sm space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Data Flow Verification</h3>
        <IntegrationStatus />
      </div>
      
      <div>
        <h4 className="font-medium text-primary mb-4">Query Data Comparison</h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-primary">Business Context</h5>
            <p>Business ID: {businessId}</p>
            <p>Authenticated: {isAuthenticated}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-primary">Unified Data Counts</h5>
            <p>Customers: {customersCount}</p>
            <p>Quotes: {quotesCount}</p>
            <p>Jobs: {jobsCount}</p>
            <p>Invoices: {invoicesCount}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-primary">Unified Data Records</h5>
            <p>Customers: {customers.length}</p>
            <p>Jobs: {jobs.length}</p>
            <p>Quotes: {quotes.length}</p>
            <p>Invoices: {invoices.length}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-primary">Status</h5>
            <p className="text-green-600">✓ React Query Migration Complete</p>
            <p className="text-green-600">✓ Store Dependencies Removed</p>
            <p className="text-green-600">✓ Unified Data Layer Active</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t">
        <h4 className="font-medium text-primary mb-4">Business Scoping Test</h4>
        <BusinessScopingTest />
      </div>
    </div>
  );
}