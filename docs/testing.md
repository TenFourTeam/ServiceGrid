# Testing Guide

## Overview

This project uses a comprehensive test suite including unit tests, integration tests, and end-to-end tests.

## Test Types

### Unit Tests
- **Command**: `npm run test:unit`
- **Purpose**: Test individual components and utilities in isolation
- **Requirements**: No additional setup required

### Integration Tests
- **Command**: `npm run test:integration`
- **Purpose**: Test API interactions, database operations, and RLS policies
- **Requirements**: Requires `SUPABASE_SERVICE_ROLE_KEY` environment variable

### End-to-End Tests
- **Command**: `npm run test:e2e`
- **Purpose**: Test complete user workflows in a browser environment
- **Requirements**: Requires built application and Playwright browsers

## Running Integration Tests Locally

Integration tests require access to the Supabase service role key to bypass Row Level Security (RLS) policies during testing.

### Setup Steps:

1. **Get the Service Role Key**:
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Copy the "service_role" key (not the anon key)

2. **Set the Environment Variable**:
   ```bash
   # Option 1: Set for current session
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   
   # Option 2: Add to your shell profile (persistent)
   echo 'export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Run the Tests**:
   ```bash
   npm run test:integration
   ```

### Troubleshooting

If you see the error "SUPABASE_SERVICE_ROLE_KEY environment variable is required":
- Verify the environment variable is set: `echo $SUPABASE_SERVICE_ROLE_KEY`
- Make sure you're using the service role key, not the anon key
- Restart your terminal if you added it to your shell profile

## CI/CD Testing

The GitHub Actions workflow automatically runs all test suites:
- Integration tests use the `SUPABASE_SERVICE_ROLE_KEY` repository secret
- All environment variables are configured in the workflow files

## Test Structure

```
tests/
├── fixtures/          # Test utilities and setup
├── integration/        # API and database tests
├── unit/              # Component and utility tests
└── e2e/               # End-to-end browser tests
```

## Best Practices

1. **Isolation**: Each test should be independent and clean up after itself
2. **Real Data**: Integration tests use real Supabase connections for authenticity
3. **Mocking**: Unit tests mock external dependencies for speed and reliability
4. **Cleanup**: All tests include proper cleanup to avoid data pollution