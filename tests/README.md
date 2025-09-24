# Testing Strategy

This project uses a comprehensive testing approach with React hook integration tests that focus on user experience and business logic without infrastructure complexity.

## Testing Architecture

### 1. Integration Tests (React Hooks)

**Location**: `tests/integration/hooks.integration.test.ts`

**Strategy**: Test React hooks with mocked `useAuthApi` responses

**Benefits**:
- Tests the complete React layer (hooks, state management, UI logic)
- No authentication, database, or network dependencies
- Fast execution with predictable results
- Simple setup and maintenance
- Tests actual user experience through React components

**Example**:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useCustomersData } from '@/hooks/useCustomersData';
import { mockUseAuthApi } from '../fixtures/mockAuthApi';

// Mock the API at the React hook level
vi.mock('@/hooks/useAuthApi', () => ({
  useAuthApi: mockUseAuthApi('owner')
}));

test('fetches customer data correctly', async () => {
  const { result } = renderHook(() => useCustomersData(), { wrapper });
  
  await waitFor(() => {
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].name).toBe('John Doe');
  });
});
```

### 2. Unit Tests

**Location**: `tests/unit/*.unit.test.ts`

**Strategy**: Test pure business logic functions

**Focus**:
- Utility functions (money, validation, formatting)
- Calculation logic
- Pure functions without side effects

## Test Utilities

### `tests/fixtures/mockAuthApi.ts`

- Mock implementation of `useAuthApi` hook
- Returns controlled, realistic API responses
- Supports different user scenarios (owner, worker, unauthorized)
- Simulates role-based access control

### `tests/fixtures/mockResponses.ts`

- Realistic mock data that matches production API responses
- Covers all major Edge Functions (customers, quotes, invoices, etc.)
- Includes success and error scenarios
- Easy to extend for new test cases

## Running Tests

```bash
# Run all tests
npm test

# Run only integration tests
npm run test:integration

# Run only unit tests  
npm run test:unit

# Run specific test file
npm test tests/integration/hooks.integration.test.ts
```

## Test Scenarios

The testing framework supports multiple user scenarios:

- **owner**: Business owner with full permissions
- **worker**: Business worker with limited access
- **unauthorized**: Unauthenticated user (error scenarios)

This allows testing:
- Role-based access control (owner vs worker permissions)
- Business data isolation and security
- Authentication edge cases
- Error handling and user experience

## Writing New Tests

### Integration Tests (Recommended)

1. Add mock responses to `mockResponses.ts` for your Edge Function
2. Write focused tests using `renderHook` and React Query
3. Test different user scenarios and business contexts
4. Verify proper data handling and error states

```typescript
describe('My Feature Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches data correctly for business owner', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useMyFeatureData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.isError).toBe(false);
  });
});
```

### Unit Tests

For pure business logic without React dependencies:

**Location**: `tests/unit/*.unit.test.ts`

**Focus**:
- Utility functions (money, validation, formatting)
- Calculation logic  
- Pure functions without side effects

## Best Practices

1. **Mock at the Hook Level**: Use `mockUseAuthApi` instead of complex JWT mocking
2. **Test User Experience**: Focus on what users actually interact with
3. **Keep It Simple**: Prefer simple mocks over complex infrastructure setup
4. **Test Error States**: Verify error handling and loading states work correctly
5. **Use Realistic Data**: Mock responses should match production API structure
6. **Fast Feedback**: Tests should run quickly for rapid development cycles

## Environment Variables

The new testing approach requires minimal environment setup:

- ✅ No `SUPABASE_SERVICE_ROLE_KEY` needed
- ✅ No JWT secret configuration required
- ✅ Works in all environments without additional setup
- ✅ No network dependencies or external service requirements