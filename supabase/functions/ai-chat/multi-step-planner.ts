/**
 * Multi-Step Planner
 * 
 * Enables complex tasks requiring multiple tool calls with:
 * - Task decomposition into subtasks
 * - Sequential tool execution with state tracking
 * - Progress reporting for long-running tasks
 * - Rollback on failure
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PlanStep {
  id: string;
  name: string;
  description: string;
  tool: string;
  args: Record<string, any>;
  dependsOn: string[];  // Step IDs this depends on
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back' | 'skipped';
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionPlan {
  id: string;
  name: string;
  description: string;
  steps: PlanStep[];
  status: 'planning' | 'awaiting_approval' | 'executing' | 'completed' | 'failed' | 'rolled_back' | 'cancelled';
  currentStepIndex: number;
  createdAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  rollbackSteps?: PlanStep[];
}

export interface PlannerResult {
  type: 'plan_preview' | 'step_progress' | 'step_complete' | 'plan_complete' | 'plan_failed' | 'plan_cancelled';
  plan: ExecutionPlan;
  currentStep?: PlanStep;
  message?: string;
}

export interface ExecutionContext {
  supabase: any;
  businessId: string;
  userId: string;
  controller?: ReadableStreamDefaultController;
  tools: Record<string, any>;
}

// =============================================================================
// MULTI-STEP PATTERNS
// =============================================================================

interface MultiStepPattern {
  id: string;
  name: string;
  description: string;
  patterns: RegExp[];
  keywords: string[];
  steps: Array<{
    name: string;
    description: string;
    tool: string;
    argMapping: (context: any, previousResults: Record<string, any>) => Record<string, any>;
    dependsOn?: string[];
    optional?: boolean;
  }>;
  requiresApproval: boolean;
}

const MULTI_STEP_PATTERNS: MultiStepPattern[] = [
  // Schedule all + send confirmations
  {
    id: 'schedule_and_notify',
    name: 'Schedule Jobs & Send Confirmations',
    description: 'Schedule all pending jobs and send confirmation emails to customers',
    patterns: [
      /schedule\s+(all|the|my)\s+(pending|unscheduled)?\s*jobs?\s+(and|then)\s+(send|email|notify)/i,
      /batch\s+schedule\s+(and|then)\s+notify/i,
      /schedule\s+everything\s+and\s+confirm/i,
    ],
    keywords: ['schedule', 'send', 'confirm', 'notify', 'email'],
    steps: [
      {
        name: 'Get Unscheduled Jobs',
        description: 'Find all jobs that need scheduling',
        tool: 'get_unscheduled_jobs',
        argMapping: () => ({}),
      },
      {
        name: 'Schedule Jobs',
        description: 'Schedule jobs using AI optimization',
        tool: 'batch_schedule_jobs',
        argMapping: (ctx, results) => ({
          jobIds: results['get_unscheduled_jobs']?.unscheduled_jobs?.map((j: any) => j.id) || [],
        }),
        dependsOn: ['get_unscheduled_jobs'],
      },
      {
        name: 'Send Confirmations',
        description: 'Email customers with appointment details',
        tool: 'send_job_confirmations',
        argMapping: (ctx, results) => ({
          jobIds: results['batch_schedule_jobs']?.scheduledJobs?.map((j: any) => j.jobId) || [],
        }),
        dependsOn: ['batch_schedule_jobs'],
      },
    ],
    requiresApproval: true,
  },

  // Create invoice and send
  {
    id: 'create_and_send_invoice',
    name: 'Create & Send Invoice',
    description: 'Create an invoice from a quote or job and send it to the customer',
    patterns: [
      /create\s+(an?\s+)?invoice\s+(from|for)\s+.+\s+(and|then)\s+send/i,
      /invoice\s+.+\s+and\s+email/i,
      /bill\s+(the\s+)?customer\s+and\s+send/i,
    ],
    keywords: ['create', 'invoice', 'send', 'email', 'bill'],
    steps: [
      {
        name: 'Create Invoice',
        description: 'Generate invoice from quote or job',
        tool: 'create_invoice',
        argMapping: (ctx) => ({
          quoteId: ctx.entities?.quoteId,
          jobId: ctx.entities?.jobId,
          customerId: ctx.entities?.customerId,
        }),
      },
      {
        name: 'Send Invoice',
        description: 'Email invoice to customer',
        tool: 'send_invoice',
        argMapping: (ctx, results) => ({
          invoiceId: results['create_invoice']?.invoice_id,
        }),
        dependsOn: ['create_invoice'],
      },
    ],
    requiresApproval: true,
  },

  // Approve quote and create job
  {
    id: 'approve_quote_and_create_job',
    name: 'Approve Quote & Create Job',
    description: 'Approve the quote, create a job from it, and optionally assign a checklist',
    patterns: [
      /approve\s+(the\s+)?quote\s+(and|then)\s+(create|make)\s+(a\s+)?job/i,
      /convert\s+(approved\s+)?quote\s+to\s+job/i,
      /turn\s+quote\s+into\s+job/i,
    ],
    keywords: ['approve', 'quote', 'create', 'job', 'convert'],
    steps: [
      {
        name: 'Approve Quote',
        description: 'Mark the quote as approved',
        tool: 'approve_quote',
        argMapping: (ctx) => ({
          quoteId: ctx.entities?.quoteId,
        }),
      },
      {
        name: 'Create Job',
        description: 'Convert the approved quote to a work order',
        tool: 'convert_quote_to_job',
        argMapping: (ctx, results) => ({
          quoteId: results['approve_quote']?.quote_id || ctx.entities?.quoteId,
        }),
        dependsOn: ['approve_quote'],
      },
      {
        name: 'Assign Checklist',
        description: 'Attach a checklist template to the new job',
        tool: 'assign_checklist_to_job',
        argMapping: (ctx, results) => ({
          jobId: results['convert_quote_to_job']?.job_id,
          templateId: ctx.entities?.checklistTemplateId || 'default',
        }),
        dependsOn: ['convert_quote_to_job'],
        optional: true,
      },
    ],
    requiresApproval: true,
  },

  // Close completed jobs and invoice
  {
    id: 'close_jobs_and_invoice',
    name: 'Close Jobs & Generate Invoices',
    description: 'Mark completed jobs as closed and create invoices for them',
    patterns: [
      /close\s+(all\s+)?completed\s+jobs\s+(and|then)\s+(generate|create)\s+invoices?/i,
      /finish\s+jobs\s+and\s+bill/i,
      /complete\s+jobs\s+and\s+invoice/i,
    ],
    keywords: ['close', 'complete', 'jobs', 'invoice', 'bill'],
    steps: [
      {
        name: 'Get Completed Jobs',
        description: 'Find all jobs marked as completed',
        tool: 'get_completed_jobs',
        argMapping: (ctx) => ({
          dateRange: ctx.entities?.dateRange,
        }),
      },
      {
        name: 'Close Jobs',
        description: 'Update job status to closed',
        tool: 'batch_update_job_status',
        argMapping: (ctx, results) => ({
          jobIds: results['get_completed_jobs']?.jobs?.map((j: any) => j.id) || [],
          newStatus: 'Closed',
        }),
        dependsOn: ['get_completed_jobs'],
      },
      {
        name: 'Generate Invoices',
        description: 'Create invoices for closed jobs',
        tool: 'batch_create_invoices',
        argMapping: (ctx, results) => ({
          jobIds: results['batch_update_job_status']?.updatedJobIds || [],
        }),
        dependsOn: ['batch_update_job_status'],
      },
    ],
    requiresApproval: true,
  },

  // Send payment reminders
  {
    id: 'send_payment_reminders',
    name: 'Send Payment Reminders',
    description: 'Find overdue invoices and send reminder emails',
    patterns: [
      /send\s+(all\s+)?payment\s+reminders?/i,
      /remind\s+(all\s+)?customers?\s+(about\s+)?(overdue\s+)?payments?/i,
      /follow\s+up\s+on\s+(all\s+)?unpaid\s+invoices?/i,
    ],
    keywords: ['remind', 'payment', 'overdue', 'follow up', 'unpaid'],
    steps: [
      {
        name: 'Get Overdue Invoices',
        description: 'Find all invoices past their due date',
        tool: 'get_overdue_invoices',
        argMapping: () => ({}),
      },
      {
        name: 'Send Reminders',
        description: 'Email payment reminders to customers',
        tool: 'batch_send_reminders',
        argMapping: (ctx, results) => ({
          invoiceIds: results['get_overdue_invoices']?.invoices?.map((i: any) => i.id) || [],
        }),
        dependsOn: ['get_overdue_invoices'],
      },
    ],
    requiresApproval: true,
  },

  // Optimize today's route
  {
    id: 'optimize_daily_route',
    name: 'Optimize Route & Preview',
    description: "Optimize today's job route and show the optimized order",
    patterns: [
      /optimize\s+(today'?s?\s+)?route\s+(and|then)\s+(show|preview|display)/i,
      /best\s+route\s+for\s+today/i,
      /minimize\s+(today'?s?\s+)?driving/i,
    ],
    keywords: ['optimize', 'route', 'today', 'driving', 'preview'],
    steps: [
      {
        name: 'Get Today\'s Jobs',
        description: 'Fetch all scheduled jobs for today',
        tool: 'get_schedule_summary',
        argMapping: () => {
          const today = new Date().toISOString().split('T')[0];
          return { startDate: today, endDate: today };
        },
      },
      {
        name: 'Optimize Route',
        description: 'Calculate optimal driving order',
        tool: 'optimize_route_for_date',
        argMapping: () => ({
          date: new Date().toISOString().split('T')[0],
        }),
        dependsOn: ['get_schedule_summary'],
      },
    ],
    requiresApproval: false,
  },
];

// =============================================================================
// ROLLBACK OPERATIONS
// =============================================================================

const ROLLBACK_OPERATIONS: Record<string, { tool: string; argBuilder: (stepResult: any) => Record<string, any> } | null> = {
  'batch_schedule_jobs': {
    tool: 'unschedule_jobs',
    argBuilder: (result) => ({
      jobIds: result?.scheduledJobs?.map((j: any) => j.jobId) || [],
    }),
  },
  'create_invoice': {
    tool: 'void_invoice',
    argBuilder: (result) => ({
      invoiceId: result?.invoice_id,
    }),
  },
  'update_job_status': {
    tool: 'update_job_status',
    argBuilder: (result) => ({
      jobId: result?.job_id,
      newStatus: result?.previous_status || 'Scheduled',
    }),
  },
  'batch_update_job_status': {
    tool: 'batch_update_job_status',
    argBuilder: (result) => ({
      jobIds: result?.updatedJobIds || [],
      newStatus: result?.previousStatus || 'Completed',
    }),
  },
  'assign_job_to_member': {
    tool: 'unassign_job_from_member',
    argBuilder: (result) => ({
      jobId: result?.job_id,
      userId: result?.user_id,
    }),
  },
  // Can't rollback these
  'send_invoice': null,
  'send_job_confirmations': null,
  'batch_send_reminders': null,
  'approve_quote': null, // Could potentially unapprove but risky
};

// =============================================================================
// TASK DECOMPOSITION
// =============================================================================

export function detectMultiStepTask(
  message: string,
  entities: Record<string, any>
): { isMultiStep: boolean; pattern?: MultiStepPattern } {
  const messageLower = message.toLowerCase();

  for (const pattern of MULTI_STEP_PATTERNS) {
    // Check regex patterns
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        return { isMultiStep: true, pattern };
      }
    }

    // Check keyword combinations
    const matchedKeywords = pattern.keywords.filter(kw => 
      messageLower.includes(kw.toLowerCase())
    );
    if (matchedKeywords.length >= 2) {
      return { isMultiStep: true, pattern };
    }
  }

  return { isMultiStep: false };
}

export function buildExecutionPlan(
  pattern: MultiStepPattern,
  entities: Record<string, any>
): ExecutionPlan {
  const planId = crypto.randomUUID();
  
  const steps: PlanStep[] = pattern.steps.map((stepDef, index) => ({
    id: `step_${index + 1}_${stepDef.tool}`,
    name: stepDef.name,
    description: stepDef.description,
    tool: stepDef.tool,
    args: {}, // Will be populated during execution
    dependsOn: stepDef.dependsOn?.map(dep => {
      const depIndex = pattern.steps.findIndex(s => s.tool === dep);
      return depIndex >= 0 ? `step_${depIndex + 1}_${dep}` : dep;
    }) || [],
    status: 'pending',
  }));

  return {
    id: planId,
    name: pattern.name,
    description: pattern.description,
    steps,
    status: pattern.requiresApproval ? 'awaiting_approval' : 'planning',
    currentStepIndex: 0,
    createdAt: new Date().toISOString(),
  };
}

// =============================================================================
// PLAN EXECUTION
// =============================================================================

export async function executePlan(
  plan: ExecutionPlan,
  context: ExecutionContext,
  entities: Record<string, any>,
  pattern: MultiStepPattern,
  onProgress: (result: PlannerResult) => void
): Promise<ExecutionPlan> {
  const startTime = Date.now();
  plan.status = 'executing';
  
  const results: Record<string, any> = {};

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    plan.currentStepIndex = i;

    // Check dependencies
    const unmetDeps = step.dependsOn.filter(depId => {
      const depStep = plan.steps.find(s => s.id === depId);
      return depStep && depStep.status !== 'completed';
    });

    if (unmetDeps.length > 0) {
      // Skip if optional, fail if required
      const stepDef = pattern.steps[i];
      if (stepDef?.optional) {
        step.status = 'skipped';
        continue;
      }
      step.status = 'failed';
      step.error = `Dependencies not met: ${unmetDeps.join(', ')}`;
      plan.status = 'failed';
      onProgress({ type: 'plan_failed', plan, currentStep: step, message: step.error });
      return plan;
    }

    // Execute step
    step.status = 'running';
    step.startedAt = new Date().toISOString();
    
    onProgress({ 
      type: 'step_progress', 
      plan, 
      currentStep: step,
      message: `Running: ${step.name}`,
    });

    try {
      // Build args from pattern definition
      const stepDef = pattern.steps.find(s => s.tool === step.tool);
      if (stepDef) {
        step.args = stepDef.argMapping({ entities }, results);
      }

      // Get the tool
      const tool = context.tools[step.tool];
      if (!tool) {
        throw new Error(`Tool not found: ${step.tool}`);
      }

      // Execute
      const toolContext = {
        supabase: context.supabase,
        businessId: context.businessId,
        userId: context.userId,
        controller: context.controller,
      };

      const result = await tool.execute(step.args, toolContext);
      
      step.result = result;
      step.status = 'completed';
      step.completedAt = new Date().toISOString();
      
      // Store result for dependent steps
      results[step.tool] = result;

      onProgress({
        type: 'step_complete',
        plan,
        currentStep: step,
        message: `Completed: ${step.name}`,
      });

    } catch (error: any) {
      console.error(`[multi-step-planner] Step ${step.id} failed:`, error);
      step.status = 'failed';
      step.error = error.message || 'Unknown error';
      step.completedAt = new Date().toISOString();

      // Attempt rollback
      plan.status = 'failed';
      await rollbackPlan(plan, i, context, pattern);

      onProgress({
        type: 'plan_failed',
        plan,
        currentStep: step,
        message: `Failed at step "${step.name}": ${step.error}`,
      });

      return plan;
    }
  }

  // All steps completed
  plan.status = 'completed';
  plan.completedAt = new Date().toISOString();
  plan.totalDurationMs = Date.now() - startTime;

  onProgress({
    type: 'plan_complete',
    plan,
    message: `Plan completed successfully in ${Math.round(plan.totalDurationMs / 1000)}s`,
  });

  return plan;
}

// =============================================================================
// ROLLBACK
// =============================================================================

async function rollbackPlan(
  plan: ExecutionPlan,
  failedStepIndex: number,
  context: ExecutionContext,
  pattern: MultiStepPattern
): Promise<void> {
  console.info('[multi-step-planner] Starting rollback from step', failedStepIndex);
  plan.rollbackSteps = [];

  // Rollback in reverse order
  for (let i = failedStepIndex - 1; i >= 0; i--) {
    const step = plan.steps[i];
    
    if (step.status !== 'completed') continue;

    const rollbackOp = ROLLBACK_OPERATIONS[step.tool];
    
    if (!rollbackOp) {
      console.info(`[multi-step-planner] No rollback available for ${step.tool}`);
      continue;
    }

    try {
      const rollbackTool = context.tools[rollbackOp.tool];
      if (!rollbackTool) {
        console.warn(`[multi-step-planner] Rollback tool not found: ${rollbackOp.tool}`);
        continue;
      }

      const rollbackArgs = rollbackOp.argBuilder(step.result);
      
      const rollbackStep: PlanStep = {
        id: `rollback_${step.id}`,
        name: `Rollback: ${step.name}`,
        description: `Reverting ${step.name}`,
        tool: rollbackOp.tool,
        args: rollbackArgs,
        dependsOn: [],
        status: 'running',
        startedAt: new Date().toISOString(),
      };

      const toolContext = {
        supabase: context.supabase,
        businessId: context.businessId,
        userId: context.userId,
      };

      await rollbackTool.execute(rollbackArgs, toolContext);
      
      rollbackStep.status = 'completed';
      rollbackStep.completedAt = new Date().toISOString();
      step.status = 'rolled_back';
      
      plan.rollbackSteps.push(rollbackStep);
      
      console.info(`[multi-step-planner] Rolled back step ${step.id}`);
    } catch (error: any) {
      console.error(`[multi-step-planner] Rollback failed for step ${step.id}:`, error);
      // Continue with other rollbacks
    }
  }

  if (plan.rollbackSteps.length > 0) {
    plan.status = 'rolled_back';
  }
}

// =============================================================================
// SSE HELPERS
// =============================================================================

export function sendPlanPreview(
  controller: ReadableStreamDefaultController,
  plan: ExecutionPlan
): void {
  const encoder = new TextEncoder();
  const event = {
    type: 'plan_preview',
    plan: {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      steps: plan.steps.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        tool: s.tool,
        status: s.status,
      })),
      requiresApproval: plan.status === 'awaiting_approval',
    },
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export function sendStepProgress(
  controller: ReadableStreamDefaultController,
  plan: ExecutionPlan,
  step: PlanStep,
  message?: string
): void {
  const encoder = new TextEncoder();
  const event = {
    type: 'step_progress',
    planId: plan.id,
    stepIndex: plan.currentStepIndex,
    totalSteps: plan.steps.length,
    step: {
      id: step.id,
      name: step.name,
      status: step.status,
      result: step.result,
      error: step.error,
    },
    message,
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export function sendPlanComplete(
  controller: ReadableStreamDefaultController,
  plan: ExecutionPlan
): void {
  const encoder = new TextEncoder();
  const successfulSteps = plan.steps.filter(s => s.status === 'completed').length;
  const failedSteps = plan.steps.filter(s => s.status === 'failed').length;
  
  const event = {
    type: 'plan_complete',
    planId: plan.id,
    status: plan.status,
    summary: {
      totalSteps: plan.steps.length,
      successfulSteps,
      failedSteps,
      skippedSteps: plan.steps.filter(s => s.status === 'skipped').length,
      rolledBackSteps: plan.rollbackSteps?.length || 0,
      durationMs: plan.totalDurationMs,
    },
    results: plan.steps
      .filter(s => s.status === 'completed')
      .map(s => ({ stepId: s.id, name: s.name, result: s.result })),
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

// =============================================================================
// PENDING PLAN STORAGE (in-memory for now, could be moved to DB)
// =============================================================================

const pendingPlans = new Map<string, { plan: ExecutionPlan; pattern: MultiStepPattern; entities: Record<string, any>; userId: string }>();
const pendingPlansByUser = new Map<string, string>(); // userId -> planId

export function storePendingPlan(
  plan: ExecutionPlan,
  pattern: MultiStepPattern,
  entities: Record<string, any>,
  userId: string
): void {
  pendingPlans.set(plan.id, { plan, pattern, entities, userId });
  pendingPlansByUser.set(userId, plan.id);
  
  // Auto-cleanup after 10 minutes
  setTimeout(() => {
    pendingPlans.delete(plan.id);
    if (pendingPlansByUser.get(userId) === plan.id) {
      pendingPlansByUser.delete(userId);
    }
  }, 10 * 60 * 1000);
}

export function getPendingPlan(planId: string): { plan: ExecutionPlan; pattern: MultiStepPattern; entities: Record<string, any>; userId: string } | undefined {
  return pendingPlans.get(planId);
}

export function getMostRecentPendingPlan(userId: string): { plan: ExecutionPlan; pattern: MultiStepPattern; entities: Record<string, any>; userId: string } | undefined {
  const planId = pendingPlansByUser.get(userId);
  if (!planId) return undefined;
  return pendingPlans.get(planId);
}

export function removePendingPlan(planId: string): void {
  const planData = pendingPlans.get(planId);
  if (planData) {
    if (pendingPlansByUser.get(planData.userId) === planId) {
      pendingPlansByUser.delete(planData.userId);
    }
  }
  pendingPlans.delete(planId);
}

// =============================================================================
// PLAN APPROVAL DETECTION
// =============================================================================

export interface PlanApprovalResult {
  isApproval: boolean;
  isRejection: boolean;
  planId?: string;
}

export function detectPlanApproval(message: string): PlanApprovalResult {
  const trimmedMessage = message.trim();
  
  // Check for explicit plan ID patterns first
  const approvalMatch = trimmedMessage.match(/^plan_approve:([a-f0-9-]+)$/i);
  if (approvalMatch) {
    return { isApproval: true, isRejection: false, planId: approvalMatch[1] };
  }
  
  const rejectMatch = trimmedMessage.match(/^plan_reject:([a-f0-9-]+)$/i);
  if (rejectMatch) {
    return { isApproval: false, isRejection: true, planId: rejectMatch[1] };
  }
  
  // Check for generic approval patterns
  const approvalPatterns = [
    /^(yes|approve|confirm|proceed|execute|do it|go ahead|run it|start|let's do it)$/i,
  ];
  
  for (const pattern of approvalPatterns) {
    if (pattern.test(trimmedMessage)) {
      return { isApproval: true, isRejection: false };
    }
  }
  
  // Check for generic rejection patterns
  const rejectionPatterns = [
    /^(no|cancel|stop|reject|nevermind|don't|abort)$/i,
  ];
  
  for (const pattern of rejectionPatterns) {
    if (pattern.test(trimmedMessage)) {
      return { isApproval: false, isRejection: true };
    }
  }
  
  return { isApproval: false, isRejection: false };
}

// =============================================================================
// PLAN CANCELLED SSE HELPER
// =============================================================================

export function sendPlanCancelled(
  controller: ReadableStreamDefaultController,
  planId: string,
  message?: string
): void {
  const encoder = new TextEncoder();
  const event = {
    type: 'plan_cancelled',
    planId,
    message: message || 'Plan cancelled. How else can I help?',
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}
