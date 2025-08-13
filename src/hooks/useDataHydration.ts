import { useEffect } from 'react';
import { useStore } from '@/store/useAppStore';
import { useSupabaseCustomers } from './useSupabaseCustomers';
import { useSupabaseQuotes } from './useSupabaseQuotes';
import { useSupabaseJobs } from './useSupabaseJobs';
import { useSupabaseInvoices } from './useSupabaseInvoices';
import { useAuthSnapshot } from '@/auth';

/**
 * Hydrates local store with server data from business-scoped APIs
 * This ensures server state properly flows into optimistic local state
 */
export function useDataHydration() {
  const store = useStore();
  const { snapshot } = useAuthSnapshot();
  const { data: customersData } = useSupabaseCustomers();
  const { data: quotesData } = useSupabaseQuotes();
  const { data: jobsData } = useSupabaseJobs();
  const { data: invoicesData } = useSupabaseInvoices();

  // Hydrate customers from server
  useEffect(() => {
    if (snapshot.phase === 'authenticated' && customersData?.rows) {
      const serverCustomers = customersData.rows.map(row => ({
        id: row.id,
        businessId: snapshot.businessId || store.business.id,
        name: row.name,
        email: row.email || undefined,
        phone: row.phone || undefined,
        address: row.address || undefined,
        notes: undefined, // Server may not have notes field yet
      }));

      // Update store with server data (merge with local optimistic updates)
      serverCustomers.forEach(customer => {
        const existsInLocal = store.customers.find(c => c.id === customer.id);
        if (!existsInLocal) {
          store.upsertCustomer(customer);
        }
      });
    }
  }, [customersData, snapshot.phase, snapshot.businessId, store]);

  // Hydrate quotes from server 
  useEffect(() => {
    if (snapshot.phase === 'authenticated' && quotesData?.rows) {
      quotesData.rows.forEach(quote => {
        const existsInLocal = store.quotes.find(q => q.id === quote.id);
        if (!existsInLocal) {
          store.upsertQuote({
            id: quote.id,
            customerId: quote.customerId,
            // Basic quote data - full schema sync will happen over time
            total: quote.total || 0,
            status: quote.status,
          });
        }
      });
    }
  }, [quotesData, snapshot.phase, store]);

  // Hydrate jobs from server
  useEffect(() => {
    if (snapshot.phase === 'authenticated' && jobsData?.rows) {
      jobsData.rows.forEach(job => {
        const existsInLocal = store.jobs.find(j => j.id === job.id);
        if (!existsInLocal) {
          store.upsertJob({
            id: job.id,
            customerId: job.customerId,
            startsAt: job.startsAt,
            endsAt: job.endsAt,
            address: job.address,
            title: job.title,
            status: job.status,
            total: job.total,
            notes: job.notes,
            createdAt: job.createdAt,
          });
        }
      });
    }
  }, [jobsData, snapshot.phase, store]);

  // Hydrate invoices from server
  useEffect(() => {
    if (snapshot.phase === 'authenticated' && invoicesData?.rows) {
      invoicesData.rows.forEach(invoice => {
        const existsInLocal = store.invoices.find(i => i.id === invoice.id);
        if (!existsInLocal) {
          store.upsertInvoice({
            id: invoice.id,
            number: invoice.number,
            businessId: snapshot.businessId || store.business.id,
            customerId: invoice.customerId,
            jobId: invoice.jobId,
            lineItems: [], // Start with empty line items for now
            taxRate: invoice.taxRate || 0,
            discount: invoice.discount || 0,
            subtotal: invoice.subtotal || 0,
            total: invoice.total || 0,
            status: invoice.status,
            dueAt: invoice.dueAt,
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
            publicToken: invoice.publicToken,
          });
        }
      });
    }
  }, [invoicesData, snapshot.phase, snapshot.businessId, store]);
}