import { useState } from 'react';
import { useStore } from '@/store/useAppStore';
import { useAuthSnapshot } from '@/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

/**
 * Test component to validate business scoping and data isolation
 * Creates test entities and verifies they're properly scoped to the current business
 */
export function BusinessScopingTest() {
  const store = useStore();
  const { snapshot } = useAuthSnapshot();
  const [testName, setTestName] = useState('Test Customer');
  const [isCreating, setIsCreating] = useState(false);

  const createTestCustomer = async () => {
    if (!snapshot.businessId) {
      toast.error('No business context available');
      return;
    }

    setIsCreating(true);
    try {
      const customer = {
        name: `${testName} ${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        businessId: snapshot.businessId,
      };

      store.upsertCustomer(customer);
      toast.success(`Created test customer: ${customer.name}`);
      
      // Verify business scoping
      const allCustomers = store.customers;
      const businessCustomers = allCustomers.filter(c => c.businessId === snapshot.businessId);
      
      console.log('[BusinessScopingTest] Verification:', {
        totalCustomers: allCustomers.length,
        businessScopedCustomers: businessCustomers.length,
        currentBusinessId: snapshot.businessId,
        newCustomer: customer,
      });

      if (businessCustomers.length === allCustomers.length) {
        toast.success('✓ Business scoping verified - all customers belong to current business');
      } else {
        toast.error('✗ Business scoping issue - customers from multiple businesses detected');
      }
      
    } catch (error) {
      toast.error('Failed to create test customer');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const createTestQuote = async () => {
    if (!snapshot.businessId) {
      toast.error('No business context available');
      return;
    }

    const customers = store.customers.filter(c => c.businessId === snapshot.businessId);
    if (customers.length === 0) {
      toast.error('Create a customer first');
      return;
    }

    try {
      const quote = {
        customerId: customers[0].id,
        businessId: snapshot.businessId,
        number: `TEST-${Date.now()}`,
        status: 'Draft' as const,
        lineItems: [],
        taxRate: 0,
        discount: 0,
        subtotal: 1000,
        total: 1000,
      };

      store.upsertQuote(quote);
      toast.success(`Created test quote: ${quote.number}`);
      
    } catch (error) {
      toast.error('Failed to create test quote');
      console.error(error);
    }
  };

  const clearTestData = () => {
    const testCustomers = store.customers.filter(c => c.name.includes('Test Customer'));
    const testQuotes = store.quotes.filter(q => q.number.includes('TEST-'));
    
    testCustomers.forEach(customer => {
      store.deleteCustomer(customer.id);
    });
    
    testQuotes.forEach(quote => {
      store.deleteQuote(quote.id);
    });
    
    toast.success(`Cleared ${testCustomers.length} test customers and ${testQuotes.length} test quotes`);
  };

  if (snapshot.phase !== 'authenticated') {
    return <div className="text-sm text-muted-foreground">Not authenticated</div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm space-y-2">
        <div><strong>Business ID:</strong> {snapshot.businessId}</div>
        <div><strong>Business Name:</strong> {snapshot.business?.name}</div>
        <div><strong>Store Business ID:</strong> {store.business.id}</div>
      </div>
      
      <div className="space-y-3">
        <div className="flex gap-2 items-center">
          <Input 
            value={testName} 
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Test customer name"
            className="flex-1"
          />
          <Button 
            onClick={createTestCustomer} 
            disabled={isCreating}
            size="sm"
          >
            {isCreating ? 'Creating...' : 'Create Test Customer'}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={createTestQuote} size="sm" variant="secondary">
            Create Test Quote
          </Button>
          <Button onClick={clearTestData} size="sm" variant="outline">
            Clear Test Data
          </Button>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p>This test verifies that:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>All created entities are scoped to the current business</li>
          <li>Business context flows correctly from auth to store</li>
          <li>Data operations maintain business isolation</li>
        </ul>
      </div>
    </div>
  );
}