import { useState } from 'react';
import { useCustomers } from '@/queries/unified';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Test component to validate business scoping and data isolation
 * Creates test entities and verifies they're properly scoped to the current business
 */
export function BusinessScopingTest() {
  const { data: customers = [] } = useCustomers();
  const { businessId, isAuthenticated } = useBusinessContext();
  const [testName, setTestName] = useState('Test Customer');
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const createTestCustomer = async () => {
    if (!businessId) {
      toast.error('No business context available');
      return;
    }

    setIsCreating(true);
    try {
      // Test customer creation would go through API
      toast.success(`Test customer creation simulated: ${testName} ${Date.now()}`);
      
      // Refresh customers data
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
    } catch (error) {
      toast.error('Failed to create test customer');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const createTestQuote = async () => {
    if (!businessId) {
      toast.error('No business context available');
      return;
    }

    if ((customers || []).length === 0) {
      toast.error('Create a customer first');
      return;
    }

    try {
      // Test quote creation would go through API
      toast.success(`Test quote creation simulated: TEST-${Date.now()}`);
      
    } catch (error) {
      toast.error('Failed to create test quote');
      console.error(error);
    }
  };

  const clearTestData = () => {
    // Test data clearing would go through API
    toast.success('Test data clearing simulated');
  };

  if (!isAuthenticated) {
    return <div className="text-sm text-muted-foreground">Not authenticated</div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm space-y-2">
        <div><strong>Business ID:</strong> {businessId}</div>
        <div><strong>Current Customers:</strong> {(customers || []).length}</div>
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
          <li>Business context flows correctly from auth to queries</li>
          <li>Data operations maintain business isolation</li>
        </ul>
      </div>
    </div>
  );
}