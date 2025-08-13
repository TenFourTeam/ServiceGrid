import { useStore } from '@/store/useAppStore';
import { useAuthSnapshot } from '@/auth';
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';
import { useSupabaseJobs } from '@/hooks/useSupabaseJobs';
import { useSupabaseInvoices } from '@/hooks/useSupabaseInvoices';
import { BusinessScopingTest } from './BusinessScopingTest';
import { IntegrationStatus } from './IntegrationStatus';

/**
 * Debug component to test and validate data flow
 * Shows server data vs local store data to verify hydration is working
 */
export function DataFlowTest() {
  const store = useStore();
  const { snapshot } = useAuthSnapshot();
  const { data: customersData } = useSupabaseCustomers();
  const { data: quotesData } = useSupabaseQuotes();
  const { data: jobsData } = useSupabaseJobs();
  const { data: invoicesData } = useSupabaseInvoices();

  if (snapshot.phase !== 'authenticated') {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="p-6 bg-card rounded-lg shadow-sm space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Phase 4: Integration & Testing</h3>
        <IntegrationStatus />
      </div>
      
      <div>
        <h4 className="font-medium text-primary mb-4">Data Flow Verification</h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-primary">Business Context</h5>
            <p>Auth Business: {snapshot.business?.name}</p>
            <p>Store Business: {store.business.name}</p>
            <p>Business ID: {snapshot.businessId}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-primary">Server Data</h5>
            <p>Customers: {customersData?.rows?.length || 0}</p>
            <p>Quotes: {quotesData?.rows?.length || 0}</p>
            <p>Jobs: {jobsData?.rows?.length || 0}</p>
            <p>Invoices: {invoicesData?.rows?.length || 0}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-primary">Local Store</h5>
            <p>Customers: {store.customers.length}</p>
            <p>Quotes: {store.quotes.length}</p>
            <p>Jobs: {store.jobs.length}</p>
            <p>Invoices: {store.invoices.length}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-primary">Status</h5>
            <p className={customersData?.rows?.length === store.customers.length ? 'text-green-600' : 'text-red-600'}>
              Customers: {customersData?.rows?.length === store.customers.length ? '✓' : '✗'}
            </p>
            <p className={quotesData?.rows?.length === store.quotes.length ? 'text-green-600' : 'text-red-600'}>
              Quotes: {quotesData?.rows?.length === store.quotes.length ? '✓' : '✗'}
            </p>
            <p className={jobsData?.rows?.length === store.jobs.length ? 'text-green-600' : 'text-red-600'}>
              Jobs: {jobsData?.rows?.length === store.jobs.length ? '✓' : '✗'}
            </p>
            <p className={invoicesData?.rows?.length === store.invoices.length ? 'text-green-600' : 'text-red-600'}>
              Invoices: {invoicesData?.rows?.length === store.invoices.length ? '✓' : '✗'}
            </p>
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