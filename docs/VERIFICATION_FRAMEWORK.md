# Universal Verification Framework

A comprehensive verification system that ensures implementation, configuration, verification, and validation are maintained at a high standard across ALL systems.

## Overview

The Universal Verification Framework provides a unified approach to system health monitoring. It applies a consistent four-dimension verification pattern to every system in the application.

```
┌─────────────────────────────────────────────────────────────┐
│                  Universal Health Check                      │
│                   npm run health:all                         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Edge Function │   │   Database    │   │   Security    │
│   Validator   │   │   Validator   │   │   Validator   │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  Four Verification        │
              │  Dimensions Per System    │
              │  • Implementation         │
              │  • Configuration          │
              │  • Verification           │
              │  • Validation             │
              └───────────────────────────┘
```

## Four Verification Dimensions

Every system is checked across four dimensions:

### 1. Implementation
Verifies that code exists and follows established patterns.

- Code files exist in expected locations
- Functions follow naming conventions
- Required exports are present
- Patterns are correctly implemented

### 2. Configuration
Validates that settings and environment are correct.

- Environment variables are set
- Configuration files are valid
- Dependencies are installed
- Database settings are correct

### 3. Verification
Ensures tests pass and contracts are valid.

- Unit tests exist and pass
- Integration tests cover key paths
- Contract validation succeeds
- Type checking passes

### 4. Validation
Confirms runtime health and E2E functionality.

- E2E tests pass for critical paths
- Runtime health checks succeed
- Performance is within bounds
- Security scanning passes

## System Validators

### Edge Function Validator
**Location:** `src/lib/verification/edge-functions/validator.ts`

Checks all 161 edge functions for:
- Presence of `index.ts` files
- CORS header configuration
- Authentication requirements
- Required secrets documentation
- Test coverage

### Database Validator
**Location:** `src/lib/verification/database/validator.ts`

Validates database configuration:
- Trigger registry completeness
- RLS policies on all tables
- Security definer functions
- Trigger naming conventions

### Security Validator
**Location:** `src/lib/verification/security/validator.ts`

Ensures security best practices:
- RLS enabled on sensitive tables
- CORS configuration
- JWT verification
- Security scanning integration

### Test Coverage Validator
**Location:** `src/lib/verification/testing/validator.ts`

Monitors test health:
- Process test coverage
- Directory structure
- Test isolation
- E2E smoke test coverage

## CLI Usage

### Run All Checks
```bash
npm run health:all
```

### Run Specific System Checks
```bash
npm run health:edge-functions
npm run health:database
npm run health:security
npm run health:testing
```

### Verbose Output
```bash
npx tsx scripts/health-check.ts --all --verbose
```

### Multiple Systems
```bash
npx tsx scripts/health-check.ts --database --security
```

## CI Integration

The health check runs automatically in CI after static analysis:

```yaml
health-check:
  runs-on: ubuntu-latest
  name: System Health Check
  needs: static-analysis
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: npm
    - run: npm install
    - run: npx tsx scripts/health-check.ts --all --verbose
```

### Exit Codes
- `0` - All checks passed (no critical issues, score >= 60%)
- `1` - Critical issues found or score < 60%

## Report Format

```
═══════════════════════════════════════════════════════════════
  🏥 UNIVERSAL HEALTH CHECK REPORT
═══════════════════════════════════════════════════════════════

System Health Summary:
────────────────────────────────────────────────────────────────
  System                    Score    Status
────────────────────────────────────────────────────────────────
  ✅ edge_function           85%     healthy
  ⚠️ database                72%     degraded
  ✅ security                 88%     healthy
  ✅ testing                  90%     healthy
────────────────────────────────────────────────────────────────
  ✅ OVERALL                  84%     healthy

❌ Critical Issues:
────────────────────────────────────────────────────────────────
  • [database] Missing RLS on sensitive_table
    └─ Enable RLS to prevent unauthorized access

📋 Recommendations:
────────────────────────────────────────────────────────────────
  1. [database] Add RLS policy to sensitive_table
  2. [edge_function] Add tests for payment-webhook function
```

## Adding New Validators

### Step 1: Create Validator Class

Create a new file in `src/lib/verification/<system>/validator.ts`:

```typescript
import { BaseValidator } from '../base-validator';
import { HealthCheck, ValidatorOptions } from '../types';

export class MySystemValidator extends BaseValidator {
  constructor(options: ValidatorOptions = {}) {
    super('my_system', options);
  }

  async checkImplementation(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    // Add implementation checks
    checks.push(
      this.pass('check-id', 'Check Name', 'implementation', 'Details')
    );
    
    return checks;
  }

  async checkConfiguration(): Promise<HealthCheck[]> {
    // Add configuration checks
    return [];
  }

  async checkVerification(): Promise<HealthCheck[]> {
    // Add verification checks
    return [];
  }

  async checkValidation(): Promise<HealthCheck[]> {
    // Add validation checks
    return [];
  }
}
```

### Step 2: Register in Health Check

Update `src/lib/verification/health-check.ts`:

```typescript
import { MySystemValidator } from './my-system/validator';

export type SystemKey = 'edge_function' | 'database' | 'security' | 'testing' | 'my_system';

function createValidator(system: SystemKey, options: ValidatorOptions = {}) {
  switch (system) {
    // ... existing cases
    case 'my_system':
      return new MySystemValidator(options);
  }
}
```

### Step 3: Add CLI Flag

Update `scripts/health-check.ts`:

```typescript
const systemFlags: Record<string, SystemKey> = {
  // ... existing flags
  '--my-system': 'my_system',
};
```

## Troubleshooting

### Health Check Fails with \"Cannot find module\"
Ensure all imports use correct paths. The verification framework uses relative imports from `src/lib/verification/`.

### Score Below Threshold
The default passing threshold is 60%. To investigate:
1. Run with `--verbose` flag
2. Check the detailed check results
3. Fix critical issues first (marked with ❌)

### Adding Skip Rules
To skip specific checks, use the `skipChecks` option:

```typescript
const report = await runHealthCheck({
  skipChecks: ['check-id-to-skip'],
});
```

## Architecture

```
src/lib/verification/
├── types.ts              # Shared types and interfaces
├── base-validator.ts     # Abstract base class
├── health-check.ts       # Aggregator and formatter
├── edge-functions/
│   ├── registry.ts       # Edge function definitions
│   └── validator.ts      # Edge function validator
├── database/
│   ├── trigger-registry.ts  # Trigger definitions
│   └── validator.ts         # Database validator
├── security/
│   └── validator.ts      # Security validator
└── testing/
    └── validator.ts      # Test coverage validator
```

## Best Practices

1. **Keep checks fast** - Health checks run in CI; avoid slow operations
2. **Be specific** - Each check should verify one thing
3. **Provide recommendations** - Always include actionable fix suggestions
4. **Use severity levels** - Mark truly critical checks as `required: true`
5. **Document patterns** - When adding checks, document the expected pattern

## Related Documentation

- [Process Implementation Blueprint](./PROCESS_IMPLEMENTATION_BLUEPRINT.md)
- [AI Agent Processes](./AI_AGENT_PROCESSES.md)
- [Security Policies](./SECURITY.md)
