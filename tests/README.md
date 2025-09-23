# Testing Strategy

This project uses a comprehensive testing approach with a focus on API endpoint integration testing that validates the complete user journey through authentication, authorization, and business logic.

## Testing Architecture

### 1. API Endpoint Integration Tests (Recommended)

**Location**: `tests/integration/*.api.endpoint.test.ts`

**Strategy**: Test the actual Edge Functions with mock Clerk authentication

**Benefits**:
- Tests the complete user experience (Clerk JWT → Profile resolution → Business context → RLS enforcement)
- Automatically validates RLS policies through the API layer
- No service role key required
- Simpler setup and more maintainable
- Tests authentication, authorization, and business logic together

**Example**:
```typescript
import { createAPITestSetup, testEdgeFunction } from '../fixtures/apiTestSetup';

// Test calling customers-crud Edge Function with proper authentication
const result = await testEdgeFunction('customers-crud', {
  scenario: 'businessOwnerA',
  scenarios: testSetup.scenarios,
  method: 'POST',
  body: { name: 'John Doe', email: 'john@test.com' }
});
```

### 2. Legacy Direct Database Tests (Being Phased Out)

**Location**: `tests/integration/*.api.int.test.ts` and `tests/integration/*.api.rls.test.ts`

**Strategy**: Direct database access with service role key

**Issues**:
- Bypasses the actual user flow
- Requires complex service role key setup
- Doesn't test the API authentication layer
- More prone to environment issues

## Test Utilities

### `tests/fixtures/apiTestSetup.ts`

- Creates mock Clerk JWTs for different user scenarios
- Sets up test data (users, businesses, memberships)
- Provides utilities to call Edge Functions with proper authentication
- Handles cleanup automatically

### `tests/fixtures/mockClerkAuth.ts`

- Generates realistic mock Clerk JWT tokens
- Creates test scenarios for different user/business combinations
- Provides HTTP headers for authenticated requests
- Builder pattern for easy test scenario creation

## Running Tests

```bash
# Run all tests
npm test

# Run only integration tests
npm test integration

# Run specific test file
npm test tests/integration/customers.api.endpoint.test.ts
```

## Test Scenarios

The testing framework supports multiple user/business scenarios:

- **businessOwnerA**: Owner of Business A
- **businessWorkerA**: Worker in Business A
- **businessOwnerB**: Owner of Business B (different business)

This allows testing:
- Role-based access control (owner vs worker permissions)
- Business data isolation (cross-business access prevention)
- Authentication edge cases
- Real user workflows

## Writing New Tests

### API Endpoint Tests (Recommended)

1. Use `createAPITestSetup()` for test environment
2. Use `testEdgeFunction()` to call Edge Functions
3. Test different user scenarios and business contexts
4. Verify proper data isolation and access control

```typescript
describe('My Feature API', () => {
  let testSetup: APITestSetup;

  beforeAll(async () => {
    testSetup = await createAPITestSetup();
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  test('feature works for business owner', async () => {
    const result = await testEdgeFunction('my-edge-function', {
      scenario: 'businessOwnerA',
      scenarios: testSetup.scenarios,
      method: 'POST',
      body: { /* test data */ }
    });

    expect(result.ok).toBe(true);
    // Add more assertions
  });
});
```

### Unit Tests

For pure business logic without database/API dependencies:

**Location**: `tests/unit/*.unit.test.ts`

Focus on:
- Utility functions
- Validation logic
- Calculation functions
- Pure functions without side effects

## Best Practices

1. **Prefer API Endpoint Tests**: They provide the most realistic validation
2. **Use Descriptive Test Names**: Clearly describe what is being tested
3. **Isolate Test Data**: Use timestamps or UUIDs to avoid conflicts
4. **Test Multiple Scenarios**: Different users, roles, and business contexts
5. **Clean Up**: Always clean up test data to avoid interference
6. **Test Edge Cases**: Authentication failures, invalid data, permissions

## Migration from Legacy Tests

If you have existing tests using the service role key approach:

1. Create new endpoint tests using `apiTestSetup.ts`
2. Replace direct database calls with Edge Function calls
3. Update assertions to work with API responses
4. Remove service role key dependencies
5. Delete legacy test files once migration is complete

## Environment Variables

The new testing approach minimizes environment variable requirements:

- ✅ No `SUPABASE_SERVICE_ROLE_KEY` needed for new tests
- ✅ Uses hardcoded Supabase URL and anon key (safe for testing)
- ✅ Works in all environments without additional setup

Legacy tests may still require the service role key until they are migrated.