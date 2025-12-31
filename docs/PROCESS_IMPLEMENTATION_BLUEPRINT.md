# Process Implementation Blueprint

A reusable template to implement any process to the same architectural standard as Lead Generation.

---

## Overview

This blueprint ensures every new process achieves:
- Full SIPOC documentation with sub-steps
- Runtime verification with automatic rollbacks
- Database-level automation via triggers
- Real-time UI feedback via SSE
- Comprehensive testing coverage

**Estimated implementation time: 7-11 hours per process**

---

## PHASE 1: Process Definition Layer

### 1.1 Create Enhanced Process Definition

**File:** `src/lib/ai-agent/process-registry.ts`

```typescript
export const {PROCESS_NAME}: EnhancedProcessDefinition = {
  id: '{process_id}',
  name: 'Human Readable Name',
  description: 'What this process accomplishes',
  phase: 'pre_service' | 'service_delivery' | 'post_service' | 'operations',
  position: N,  // 1-15 across all phases
  order: N,     // Order within phase
  depth: 0,
  currentState: 'DIY' | 'DWY' | 'DFY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: ['Who provides inputs'],
    inputs: ['What comes into the process'],
    processSteps: ['1. Step one', '2. Step two', ...],
    outputs: ['What the process produces'],
    customers: ['Who receives the outputs']
  },

  subSteps: [
    {
      id: 'sub_step_id',
      name: 'Sub-Step Name',
      order: 1,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Primary supplier',
        input: 'Primary input',
        process: 'Detailed process description',
        output: 'Primary output',
        customer: 'Who receives this output'
      },
      tools: ['tool_1', 'tool_2'],
      dbEntities: ['table_1', 'table_2'],
      automationCapabilities: [
        'What AI can do automatically',
        'DB TRIGGER: specific trigger description'
      ]
    },
    // Repeat for each sub-step (typically 3-7 sub-steps)
  ],

  tools: ['all', 'tools', 'used'],
  inputContract: { field: 'type' },
  outputContract: { field: 'type' },
  entryConditions: [],
  exitConditions: [{ type: 'entity_exists', entity: 'X', field: 'id' }],
  userCheckpoints: ['optional_approval_points'],
  nextProcesses: ['process_ids'],
  previousProcesses: ['process_ids']
};
```

### 1.2 Create Tool Contracts

**File:** `src/lib/ai-agent/tool-contracts.ts`

For each tool in the process:

```typescript
export const {TOOL_NAME}_CONTRACT: ToolContract = {
  toolName: '{tool_name}',
  description: 'What this tool does',
  processId: '{process_id}',
  subStepId: '{sub_step_id}',
  
  preconditions: [
    {
      id: 'pre_1',
      description: 'What must be true before execution',
      type: 'entity_exists' | 'field_equals' | 'field_not_null' | 'custom',
      entity: 'entity_name',
      field: 'field_name',
      fromArg: 'arg_reference'
    }
  ],
  
  postconditions: [
    {
      id: 'post_1',
      description: 'What must be true after execution',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [
    {
      id: 'inv_1',
      description: 'What must never change',
      type: 'field_equals',
      entity: 'X',
      field: 'Y',
      fromArg: 'original_value'
    }
  ],
  
  dbAssertions: [
    {
      id: 'db_1',
      description: 'Database state verification',
      table: 'table_name',
      query: {
        select: 'id, status',
        where: { id: 'result.id' }
      },
      expect: { count: 1 }
    }
  ],
  
  rollbackTool: 'reverse_tool_name',
  rollbackArgs: { arg: 'result.field' }
};

// Register in TOOL_CONTRACTS object
```

### 1.3 Create Multi-Step Pattern

**File:** `src/lib/ai-agent/multi-step-patterns.ts`

```typescript
export const {PROCESS}_PATTERN: MultiStepPattern = {
  id: 'complete_{process_name}',
  name: 'Complete {Process} Workflow',
  description: 'End-to-end execution of {process}',
  category: '{phase_name}',
  specialCardType: '{process}_workflow',  // For custom UI card
  
  steps: [
    {
      id: 'step_1',
      tool: 'tool_name',
      description: 'What this step accomplishes',
      inputMapping: {
        arg_name: '{{input.field_name}}'
      },
      outputMapping: {
        result_key: 'response.field'
      },
      optional: false,
      skipCondition: 'context.already_exists'
    },
    // Repeat for 3-10 steps
  ],
  
  preconditions: ['Required input fields'],
  postconditions: ['Expected outcomes'],
  successMetrics: {
    primary: 'Main success indicator',
    secondary: ['Additional metrics']
  }
};

// Register in MULTI_STEP_PATTERNS object
```

---

## PHASE 2: Automation Layer

### 2.1 Add Automation Settings

**File:** `supabase/migrations/XXX_{process}_automation_settings.sql`

```sql
-- Add columns to automation_settings table
ALTER TABLE automation_settings
ADD COLUMN IF NOT EXISTS auto_{action}_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS {action}_threshold INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS {action}_method TEXT DEFAULT 'default';
```

### 2.2 Create Database Triggers

**File:** `supabase/migrations/XXX_{process}_triggers.sql`

```sql
-- TRIGGER: Auto-{action} on {event}
CREATE OR REPLACE FUNCTION trigger_auto_{action}()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
BEGIN
  -- Fetch automation settings
  SELECT * INTO v_settings 
  FROM automation_settings 
  WHERE business_id = NEW.business_id 
  LIMIT 1;
  
  -- Check if automation is enabled
  IF v_settings IS NULL OR NOT v_settings.auto_{action}_enabled THEN
    RETURN NEW;
  END IF;
  
  -- ========================================
  -- AUTOMATION LOGIC HERE
  -- ========================================
  
  -- Log to ai_activity_log for observability
  INSERT INTO ai_activity_log (
    business_id, 
    user_id, 
    activity_type, 
    description, 
    accepted, 
    metadata
  ) VALUES (
    NEW.business_id,
    NEW.owner_id,
    'auto_{action}',
    format('Auto-{action}: %s', NEW.name),
    true,
    jsonb_build_object(
      'action_type', '{action}_completed',
      'entity_id', NEW.id,
      'entity_name', NEW.name
      -- Add process-specific metadata
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trg_auto_{action} ON {table_name};
CREATE TRIGGER trg_auto_{action}
  AFTER INSERT ON {table_name}
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_{action}();
```

---

## PHASE 3: Verification Layer

### 3.1 Add Rollback Tools

**File:** `src/lib/ai-agent/step-verifier.ts`

```typescript
// Add to ROLLBACK_TOOLS object
const ROLLBACK_TOOLS: Record<string, RollbackExecutor> = {
  // ... existing tools
  
  delete_{entity}: async (context, args) => {
    const { data, error } = await supabase
      .from('{table_name}')
      .delete()
      .eq('id', args.{entity}_id)
      .eq('business_id', context.businessId);
    
    return { 
      success: !error, 
      deleted: true,
      entityId: args.{entity}_id 
    };
  },
  
  revert_{entity}_status: async (context, args) => {
    const { data, error } = await supabase
      .from('{table_name}')
      .update({ status: args.previous_status })
      .eq('id', args.{entity}_id)
      .eq('business_id', context.businessId);
    
    return { 
      success: !error, 
      reverted: true 
    };
  },
};
```

### 3.2 Wire Verification in Edge Function

**File:** `supabase/functions/ai-chat/multi-step-planner.ts`

Ensure pattern detection and `executeWithVerification` is called:

```typescript
// Add pattern detection
function detect{Process}Workflow(message: string): boolean {
  const triggers = [
    '{trigger phrase 1}',
    '{trigger phrase 2}',
  ];
  return triggers.some(t => message.toLowerCase().includes(t));
}

// In executeMultiStepPlan, call executeWithVerification for each step
```

---

## PHASE 4: UI Integration Layer

### 4.1 Create Workflow Card Component

**File:** `src/components/AI/{Process}WorkflowCard.tsx`

```typescript
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, Loader2, XCircle, AlertTriangle } from 'lucide-react';

interface {Process}WorkflowStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  toolUsed?: string;
  result?: any;
  error?: string;
  verification?: {
    phase: string;
    failedAssertion?: string;
    recoverySuggestion?: string;
  };
  rollbackExecuted?: boolean;
  rollbackTool?: string;
}

interface AutomationSummary {
  // Process-specific automation results
}

interface {Process}WorkflowCardProps {
  steps: {Process}WorkflowStep[];
  currentStepIndex: number;
  entityData?: {
    // Process-specific entity data
  };
  automationSummary?: AutomationSummary;
  onPromptClick?: (prompt: string) => void;
}

export function {Process}WorkflowCard({
  steps,
  currentStepIndex,
  entityData,
  automationSummary,
  onPromptClick
}: {Process}WorkflowCardProps) {
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const isComplete = completedSteps === steps.length;
  const hasFailed = steps.some(s => s.status === 'failed');

  const getStatusIcon = (step: {Process}WorkflowStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    if (step.status === 'failed') {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    if (step.status === 'in_progress') {
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    }
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <Card className="p-4 bg-card border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">{Process} Progress</h4>
        <span className="text-xs text-muted-foreground">
          {completedSteps}/{steps.length} complete
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-2">
            {getStatusIcon(step, index)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{step.name}</p>
              {step.description && (
                <p className="text-xs text-muted-foreground">{step.description}</p>
              )}
              
              {/* Verification failure details */}
              {step.status === 'failed' && step.verification && (
                <div className="mt-2 p-2 bg-destructive/10 rounded text-xs">
                  <p className="font-medium">
                    Verification failed: {step.verification.phase}
                  </p>
                  {step.verification.failedAssertion && (
                    <p className="text-muted-foreground">
                      {step.verification.failedAssertion}
                    </p>
                  )}
                  {step.verification.recoverySuggestion && (
                    <p className="text-primary mt-1">
                      💡 {step.verification.recoverySuggestion}
                    </p>
                  )}
                  {step.rollbackExecuted && (
                    <p className="text-amber-600 mt-1">
                      ↩️ Rolled back: {step.rollbackTool}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Automation Summary (on completion) */}
      {isComplete && automationSummary && (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Automation Summary
          </p>
          {/* Render process-specific automation results */}
        </div>
      )}
    </Card>
  );
}
```

### 4.2 Add SSE Event Handling

**File:** `src/hooks/useAIChat.ts`

```typescript
// In the SSE event handler switch/if block:

} else if (data.type === '{process}_workflow') {
  // Handle workflow initialization
  setMessages(prev => [...prev, {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: '',
    messageType: '{process}_workflow',
    {process}Workflow: {
      steps: data.steps,
      currentStepIndex: 0,
      entityData: data.entityData,
    },
  }]);
  
} else if (data.type === '{process}_workflow_progress') {
  // Handle step progress updates
  setMessages(prev => {
    const workflowIdx = prev.findIndex(m => m.messageType === '{process}_workflow');
    if (workflowIdx === -1) return prev;
    
    const updated = [...prev];
    const workflow = updated[workflowIdx].{process}Workflow!;
    
    workflow.steps[data.stepIndex] = {
      ...workflow.steps[data.stepIndex],
      status: data.status,
      result: data.result,
      error: data.error,
      verification: data.verification,
      rollbackExecuted: data.rollbackExecuted,
      rollbackTool: data.rollbackTool,
    };
    workflow.currentStepIndex = data.stepIndex;
    workflow.entityData = data.entityData ?? workflow.entityData;
    workflow.automationSummary = data.automationSummary;
    
    return updated;
  });
}
```

### 4.3 Add Toast Notifications Hook

**File:** `src/hooks/use{Process}AutomationNotifications.ts`

```typescript
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { toast } from 'sonner';

export function use{Process}AutomationNotifications() {
  const { businessId } = useBusinessContext();

  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel('{process}-automation-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_activity_log',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const { activity_type, metadata } = payload.new as any;
          const actionType = metadata?.action_type;

          // Handle process-specific action types
          switch (actionType) {
            case '{action_1}_completed':
              toast.success('{Action 1} completed', {
                description: metadata.description,
              });
              break;
            case '{action_2}_completed':
              toast.info('{Action 2} completed', {
                description: metadata.description,
              });
              break;
            // Add more action types
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);
}
```

### 4.4 Render Workflow Card in Chat

**File:** `src/components/chat/ChatMessage.tsx`

```typescript
// Import the workflow card
import { {Process}WorkflowCard } from '@/components/AI/{Process}WorkflowCard';

// In the render logic:
{message.messageType === '{process}_workflow' && message.{process}Workflow && (
  <{Process}WorkflowCard
    steps={message.{process}Workflow.steps}
    currentStepIndex={message.{process}Workflow.currentStepIndex}
    entityData={message.{process}Workflow.entityData}
    automationSummary={message.{process}Workflow.automationSummary}
    onPromptClick={onPromptClick}
  />
)}
```

---

## PHASE 5: Testing Layer

### 5.1 Unit Tests

**File:** `tests/unit/{process}.unit.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { {PROCESS}_PATTERN } from '@/lib/ai-agent/multi-step-patterns';
import { TOOL_CONTRACTS } from '@/lib/ai-agent/tool-contracts';

describe('{Process} Multi-Step Pattern', () => {
  it('should have all required steps', () => {
    expect({PROCESS}_PATTERN.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('should have valid step IDs', () => {
    const stepIds = {PROCESS}_PATTERN.steps.map(s => s.id);
    const uniqueIds = new Set(stepIds);
    expect(uniqueIds.size).toBe(stepIds.length);
  });

  it('should have success metrics defined', () => {
    expect({PROCESS}_PATTERN.successMetrics).toBeDefined();
    expect({PROCESS}_PATTERN.successMetrics.primary).toBeDefined();
  });

  it('should have preconditions defined', () => {
    expect({PROCESS}_PATTERN.preconditions.length).toBeGreaterThan(0);
  });
});

describe('{Process} Tool Contracts', () => {
  const processTools = {PROCESS}_PATTERN.steps.map(s => s.tool);

  processTools.forEach(toolName => {
    describe(`${toolName} contract`, () => {
      it('should have a contract defined', () => {
        expect(TOOL_CONTRACTS[toolName]).toBeDefined();
      });

      it('should have preconditions', () => {
        const contract = TOOL_CONTRACTS[toolName];
        expect(contract.preconditions.length).toBeGreaterThan(0);
      });

      it('should have postconditions', () => {
        const contract = TOOL_CONTRACTS[toolName];
        expect(contract.postconditions.length).toBeGreaterThan(0);
      });

      it('should have rollback defined for reversible operations', () => {
        const contract = TOOL_CONTRACTS[toolName];
        if (contract.isReversible !== false) {
          expect(contract.rollbackTool).toBeDefined();
        }
      });
    });
  });
});
```

### 5.2 Integration Tests

**File:** `tests/integration/{process}.integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeWithVerification } from '@/lib/ai-agent/step-verifier';
import { TOOL_CONTRACTS } from '@/lib/ai-agent/tool-contracts';

describe('{Process} Verification Loop', () => {
  const mockContext = {
    businessId: 'test-business-id',
    userId: 'test-user-id',
    input: {},
    results: {},
    context: {},
  };

  it('should verify preconditions before execution', async () => {
    const contract = TOOL_CONTRACTS['{tool_name}'];
    const mockExecutor = vi.fn().mockResolvedValue({ id: 'test-id' });

    const result = await executeWithVerification(
      '{tool_name}',
      mockExecutor,
      { ...mockContext, args: { /* valid args */ } }
    );

    expect(result.verification.precondition.passed).toBe(true);
  });

  it('should verify postconditions after execution', async () => {
    const mockExecutor = vi.fn().mockResolvedValue({ id: 'test-id' });

    const result = await executeWithVerification(
      '{tool_name}',
      mockExecutor,
      { ...mockContext, args: { /* valid args */ } }
    );

    expect(result.verification.postcondition.passed).toBe(true);
  });

  it('should execute rollback on postcondition failure', async () => {
    const mockExecutor = vi.fn().mockResolvedValue({ /* missing required field */ });

    const result = await executeWithVerification(
      '{tool_name}',
      mockExecutor,
      { ...mockContext, args: { /* valid args */ } }
    );

    expect(result.status).toBe('rollback_executed');
    expect(result.rollback).toBeDefined();
  });

  it('should record verification metrics', async () => {
    const mockExecutor = vi.fn().mockResolvedValue({ id: 'test-id' });

    await executeWithVerification(
      '{tool_name}',
      mockExecutor,
      { ...mockContext, processId: '{process_id}', args: {} }
    );

    const metrics = getVerificationMetrics('{tool_name}');
    expect(metrics.length).toBeGreaterThan(0);
  });
});
```

### 5.3 E2E Tests

**File:** `tests/e2e/{process}.e2e.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('{Process} E2E Tests', () => {
  // Skip if no Supabase credentials
  const shouldSkip = !supabaseUrl || !supabaseServiceKey;
  
  const supabase = shouldSkip 
    ? null 
    : createClient(supabaseUrl!, supabaseServiceKey!);

  describe('Database Triggers', () => {
    it.skipIf(shouldSkip)('should auto-{action} when enabled', async () => {
      // 1. Enable automation setting
      await supabase!.from('automation_settings').upsert({
        business_id: 'test-business',
        auto_{action}_enabled: true,
      });

      // 2. Insert entity that triggers automation
      const { data: entity } = await supabase!
        .from('{table}')
        .insert({ /* entity data */ })
        .select()
        .single();

      // 3. Verify automation occurred
      expect(entity.{automated_field}).toBeDefined();
    });

    it.skipIf(shouldSkip)('should log to ai_activity_log', async () => {
      // Insert entity and check activity log
      const { data: logs } = await supabase!
        .from('ai_activity_log')
        .select('*')
        .eq('activity_type', 'auto_{action}')
        .order('created_at', { ascending: false })
        .limit(1);

      expect(logs?.length).toBeGreaterThan(0);
      expect(logs![0].metadata.action_type).toBe('{action}_completed');
    });

    it.skipIf(shouldSkip)('should respect automation settings', async () => {
      // 1. Disable automation
      await supabase!.from('automation_settings').upsert({
        business_id: 'test-business',
        auto_{action}_enabled: false,
      });

      // 2. Insert entity
      const { data: entity } = await supabase!
        .from('{table}')
        .insert({ /* entity data */ })
        .select()
        .single();

      // 3. Verify automation did NOT occur
      expect(entity.{automated_field}).toBeNull();
    });
  });

  describe('Pattern Completeness', () => {
    it('should include all required stages', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_{process}'];
      const requiredStages = ['{stage_1}', '{stage_2}', '{stage_3}'];
      
      requiredStages.forEach(stage => {
        expect(pattern.steps.some(s => s.id.includes(stage))).toBe(true);
      });
    });
  });
});
```

---

## Implementation Checklist

### ✅ Definition Layer
- [ ] `EnhancedProcessDefinition` in `process-registry.ts`
- [ ] All sub-steps defined with SIPOC
- [ ] All tools listed in tools array
- [ ] Input/output contracts defined
- [ ] Entry/exit conditions specified

### ✅ Tool Contracts (per tool)
- [ ] Preconditions defined
- [ ] Postconditions defined
- [ ] Invariants defined (if applicable)
- [ ] DB assertions defined
- [ ] Rollback tool specified
- [ ] Added to `TOOL_CONTRACTS` registry

### ✅ Multi-Step Pattern
- [ ] Pattern defined with all steps
- [ ] Input/output mappings complete
- [ ] Optional steps marked
- [ ] Skip conditions defined
- [ ] Success metrics specified
- [ ] Added to `MULTI_STEP_PATTERNS` registry

### ✅ Automation Layer
- [ ] `automation_settings` columns added
- [ ] Database triggers created
- [ ] Triggers log to `ai_activity_log`
- [ ] Triggers respect settings toggles

### ✅ Verification Layer
- [ ] Rollback tools implemented in `step-verifier.ts`
- [ ] `executeWithVerification` wired in edge function
- [ ] Metrics collection enabled

### ✅ UI Layer
- [ ] Workflow card component created
- [ ] SSE events emitted from edge function
- [ ] SSE handlers in `useAIChat.ts`
- [ ] Toast notifications for automation events
- [ ] `ChatMessage.tsx` renders workflow card

### ✅ Testing Layer
- [ ] Unit tests for pattern structure
- [ ] Unit tests for tool contracts
- [ ] Integration tests for verification loop
- [ ] E2E tests for database triggers
- [ ] E2E tests for activity logging

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/ai-agent/process-registry.ts` | Modify | Add process definition |
| `src/lib/ai-agent/tool-contracts.ts` | Modify | Add tool contracts |
| `src/lib/ai-agent/multi-step-patterns.ts` | Modify | Add pattern |
| `supabase/migrations/XXX.sql` | Create | Automation settings + triggers |
| `src/lib/ai-agent/step-verifier.ts` | Modify | Add rollback tools |
| `supabase/functions/ai-chat/index.ts` | Modify | Wire SSE events |
| `supabase/functions/ai-chat/multi-step-planner.ts` | Modify | Add workflow detection |
| `src/components/AI/{Process}WorkflowCard.tsx` | Create | Visual workflow card |
| `src/hooks/useAIChat.ts` | Modify | Handle SSE events |
| `src/hooks/use{Process}AutomationNotifications.ts` | Create | Toast notifications |
| `src/components/chat/ChatMessage.tsx` | Modify | Render workflow card |
| `tests/unit/{process}.unit.test.ts` | Create | Unit tests |
| `tests/integration/{process}.integration.test.ts` | Create | Integration tests |
| `tests/e2e/{process}.e2e.test.ts` | Create | E2E tests |

---

## PHASE 6: Automated Verification

### 6.1 Run Process Validator

The codebase includes an automated validator that checks blueprint compliance:

```typescript
import { validateProcessImplementation, validateAllProcesses } from '@/lib/ai-agent/process-validator';

// Validate a single process
const result = validateProcessImplementation('site_assessment');
console.log(`${result.processName}: ${result.score}% complete`);
console.log('Missing:', result.missingItems);
console.log('Warnings:', result.warnings);

// Validate all processes
const summary = validateAllProcesses();
console.log(`${summary.completeProcesses}/${summary.totalProcesses} processes complete`);
```

### 6.2 Verification Dashboard

View process implementation health in the Settings page:

**Settings > AI Agent > Process Verification**

The dashboard shows:
- Overall completion percentage for each process
- Detailed checks by category (definition, contracts, pattern, automation, UI, testing)
- Missing required items highlighted in red
- Optional warnings highlighted in amber

### 6.3 Validation Checks

The validator performs these checks:

| Category | Check | Required |
|----------|-------|----------|
| Definition | Process definition exists | ✅ |
| Definition | Sub-steps with SIPOC defined | ✅ |
| Definition | Preconditions defined | ✅ |
| Definition | Postconditions defined | ✅ |
| Contracts | Tool contracts defined (≥50%) | ✅ |
| Pattern | Multi-step pattern registered | ✅ |
| Pattern | Special card type defined | ⚠️ |
| Pattern | Success metrics defined | ✅ |
| Automation | Rollback tools configured (≥30%) | ✅ |
| UI | Workflow card component | ⚠️ |

### 6.4 Adding Verification to CI

Add to your CI pipeline to ensure all new processes meet the blueprint standard:

```yaml
# .github/workflows/validate-processes.yml
- name: Validate Process Implementations
  run: |
    npx vitest run tests/unit/process-validation.test.ts
```

---

## Reference Implementation

See the Lead Generation process for a complete working example:
- **Process Definition:** `src/lib/ai-agent/process-registry.ts` → `LEAD_GENERATION`
- **Tool Contracts:** `src/lib/ai-agent/tool-contracts.ts` → `CREATE_CUSTOMER_CONTRACT`, etc.
- **Multi-Step Pattern:** `src/lib/ai-agent/multi-step-patterns.ts` → `COMPLETE_LEAD_GENERATION`
- **Automation:** `supabase/migrations/*_lead_automation_*.sql`
- **Workflow Card:** `src/components/AI/LeadWorkflowCard.tsx`
- **Tests:** `tests/e2e/lead-generation.e2e.test.ts`

See the Site Assessment process for a second reference:
- **Process Definition:** `src/lib/ai-agent/process-registry.ts` → `SITE_ASSESSMENT`
- **Multi-Step Pattern:** `src/lib/ai-agent/multi-step-patterns.ts` → `COMPLETE_SITE_ASSESSMENT`
- **Workflow Card:** `src/components/AI/AssessmentWorkflowCard.tsx`
- **Tests:** `tests/unit/site-assessment.unit.test.ts`, `tests/integration/site-assessment.integration.test.ts`
