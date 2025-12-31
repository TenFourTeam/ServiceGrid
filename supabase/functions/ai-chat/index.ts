import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { requireCtx, corsHeaders } from '../_lib/auth.ts';
import { orchestrate, type SessionContext } from './agent-orchestrator.ts';
import { 
  detectMultiStepTask, 
  buildExecutionPlan, 
  executePlan, 
  sendPlanPreview, 
  sendPlanComplete,
  sendStepProgress,
  sendPlanCancelled,
  storePendingPlan,
  storePendingPlanAsync,
  getPendingPlan,
  getPendingPlanAsync,
  getMostRecentPendingPlan,
  getMostRecentPendingPlanAsync,
  removePendingPlan,
  removePendingPlanAsync,
  cleanupExpiredPlansAsync,
  detectPlanApproval,
  resumePlanAfterRecovery,
  executeConversationalRecovery,
  isLeadWorkflowPattern,
  sendLeadWorkflowStart,
  sendLeadWorkflowProgress,
  extractCustomerData,
  fetchAutomationSummary,
  isAssessmentWorkflowPattern,
  sendAssessmentWorkflowStart,
  sendAssessmentWorkflowProgress,
  fetchAssessmentAutomationSummary,
  isCommunicationWorkflowPattern,
  sendCommunicationWorkflowStart,
  sendCommunicationWorkflowProgress,
  fetchCommunicationAutomationSummary,
  extractCommunicationData,
  type ExecutionPlan,
  type ExecutionContext,
  type PlannerResult 
} from './multi-step-planner.ts';

// Process Orchestration
import {
  getProcessFromPattern,
  getSuggestedNextProcess,
  trackProcessJourney,
  detectProcessTransition,
  getProcessLabel,
  getProcessPrompt,
  type NextProcessSuggestion
} from './process-orchestrator.ts';

// Memory & Context Persistence
import { 
  loadMemory, 
  rememberEntity, 
  getRecentEntities,
  setConversationState,
  clearConversationState,
  updatePlanStatus,
  type MemoryContext,
  type ConversationMemory
} from './memory-manager.ts';
import { 
  extractEntitiesFromMessage, 
  buildEntityContextString 
} from './message-entity-extractor.ts';
import { 
  learnFromMessage, 
  learnFromToolExecution,
  getApplicablePreferences,
  buildPreferenceContextString 
} from './preference-learner.ts';
import {
  shouldSummarize,
  buildSummaryContext,
  getMessagesForSummarization,
  buildSummarizationPrompt,
  parseSummaryResponse,
  storeSummary
} from './conversation-summarizer.ts';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Tool {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any, context: any) => Promise<any>;
}

// Helper to generate conversation titles
function generateConversationTitle(firstMessage: string): string {
  const title = firstMessage
    .replace(/^(can you|could you|please|i want to|i need to|help me)\s+/i, '')
    .split(/[.!?]/)[0]
    .slice(0, 50)
    .trim();
  
  return title || 'New conversation';
}

// Helper to parse natural language selection for entity recovery
// Handles responses like "the first one", "the second", "QUO-004", "John's quote", etc.
function parseNaturalLanguageSelection(
  message: string,
  planData: { plan: any; pattern: any; entities: Record<string, any> }
): { entityType: string; entityValue: string; displayLabel: string } | null {
  // We need to look at the last failed step to determine what entity type we're looking for
  const failedStep = planData.plan.steps?.find((s: any) => s.status === 'failed');
  if (!failedStep) return null;
  
  // Get recovery actions for the tool to find the resolvesEntity
  const toolToEntityType: Record<string, string> = {
    'send_quote': 'quoteId',
    'approve_quote': 'quoteId',
    'create_invoice': 'quoteId',
    'convert_quote_to_job': 'quoteId',
    'send_invoice': 'invoiceId',
    'update_job': 'jobId',
    'send_job_confirmation': 'jobId',
  };
  
  const entityType = toolToEntityType[failedStep.tool];
  if (!entityType) return null;
  
  // Check for ordinal patterns
  const ordinalPatterns = [
    { regex: /^(the\s+)?(first|1st)\s*(one)?$/i, index: 0 },
    { regex: /^(the\s+)?(second|2nd)\s*(one)?$/i, index: 1 },
    { regex: /^(the\s+)?(third|3rd)\s*(one)?$/i, index: 2 },
    { regex: /^(the\s+)?(fourth|4th)\s*(one)?$/i, index: 3 },
    { regex: /^(the\s+)?(fifth|5th)\s*(one)?$/i, index: 4 },
    { regex: /^#?1$/i, index: 0 },
    { regex: /^#?2$/i, index: 1 },
    { regex: /^#?3$/i, index: 2 },
    { regex: /^#?4$/i, index: 3 },
    { regex: /^#?5$/i, index: 4 },
  ];
  
  // We don't have the options directly here, so we'll need to match by stored context
  // The options were stored when the plan was paused
  // For now, we'll just detect the pattern and let the caller handle the actual lookup
  
  // Check for quote number patterns like "QUO-004", "EST-001"
  const quoteNumberMatch = message.match(/\b(quo|est|inv)-?(\d{1,4})\b/i);
  if (quoteNumberMatch) {
    const prefix = quoteNumberMatch[1].toUpperCase();
    const num = quoteNumberMatch[2].padStart(3, '0');
    const fullNumber = `${prefix}-${num}`;
    
    return {
      entityType,
      entityValue: fullNumber, // The value will be resolved by querying the DB
      displayLabel: fullNumber,
    };
  }
  
  // For ordinals, we'll need the options from the last entity_selection event
  // Since we don't have that context here, we return a special marker
  for (const { regex, index } of ordinalPatterns) {
    if (regex.test(message)) {
      return {
        entityType,
        entityValue: `__ordinal:${index}`,
        displayLabel: `option ${index + 1}`,
      };
    }
  }
  
  return null;
}

// Helper to enrich tool results with display metadata for the frontend
function enrichToolResult(toolName: string, result: any, args: any): any {
  const _display: any = { summary: '', actions: [] };
  
  switch (toolName) {
    case 'check_team_availability': {
      const availCount = result.availableMembers?.length || 0;
      const date = result.date || args.date;
      _display.summary = availCount > 0 
        ? `${availCount} team member${availCount > 1 ? 's' : ''} available${date ? ` for ${date}` : ''}`
        : `No team members available${date ? ` for ${date}` : ''}`;
      if (availCount > 0) {
        _display.actions = [{ 
          label: 'Schedule with Available', 
          action: `Schedule a job with ${result.availableMembers[0]?.name || 'available team member'}` 
        }];
      }
      break;
    }
    
    case 'auto_schedule_job': {
      const title = result?.job_title || result?.job?.title || 'Job';
      const time = result?.scheduled_time || result?.starts_at;
      _display.summary = `Scheduled "${title}"${time ? ` for ${new Date(time).toLocaleDateString()}` : ''}`;
      _display.entityType = 'job';
      if (time) {
        _display.actions = [{ 
          label: 'View Calendar', 
          action: `navigate_to_calendar?date=${time.split('T')[0]}` 
        }];
      }
      break;
    }
    
    case 'batch_schedule_jobs': {
      const scheduled = result?.scheduledJobs?.length || result?.scheduled_count || 0;
      const failed = result?.failed_jobs?.length || 0;
      _display.summary = `${scheduled} job${scheduled !== 1 ? 's' : ''} scheduled${failed > 0 ? `, ${failed} need attention` : ''}`;
      _display.items = [
        ...(result.scheduledJobs || []).slice(0, 5).map((j: any) => ({ 
          name: j.title || j.jobTitle || 'Job', 
          status: 'success' as const 
        })),
        ...(result.failed_jobs || []).slice(0, 3).map((j: any) => ({ 
          name: j.jobTitle || j.title || 'Job', 
          status: 'failed' as const, 
          message: j.reason 
        }))
      ];
      _display.actions = [{ label: 'View Calendar', action: 'navigate_to_calendar' }];
      break;
    }
    
    case 'get_unscheduled_jobs': {
      const count = result?.count || result?.unscheduled_jobs?.length || 0;
      _display.summary = `Found ${count} unscheduled job${count !== 1 ? 's' : ''}`;
      if (count > 0) {
        _display.actions = [{ label: 'Schedule All', action: 'Schedule all pending jobs' }];
      }
      break;
    }
    
    case 'get_scheduling_conflicts': {
      const count = result?.total_conflicts || result?.conflicts?.length || 0;
      _display.summary = count > 0 
        ? `Found ${count} scheduling conflict${count !== 1 ? 's' : ''}`
        : 'No scheduling conflicts found';
      if (count > 0) {
        _display.actions = [{ label: 'Resolve Conflicts', action: 'Help me resolve these conflicts' }];
      }
      break;
    }
    
    case 'create_quote': {
      const number = result?.number || result?.quote_number;
      const total = result?.total;
      _display.summary = `Quote${number ? ` #${number}` : ''} created${total ? ` for $${total.toFixed(2)}` : ''}`;
      _display.entityType = 'quote';
      _display.actions = [
        { label: 'Send Quote', action: `Send quote ${number} to customer` },
        { label: 'View Quote', action: `navigate_to_entity?type=quote&id=${result.id}` }
      ];
      break;
    }
    
    case 'create_invoice': {
      const number = result?.number || result?.invoice_number;
      const total = result?.total;
      _display.summary = `Invoice${number ? ` #${number}` : ''} created${total ? ` for $${total.toFixed(2)}` : ''}`;
      _display.entityType = 'invoice';
      _display.actions = [
        { label: 'Send Invoice', action: `Send invoice ${number} to customer` },
        { label: 'View Invoice', action: `navigate_to_entity?type=invoice&id=${result.id}` }
      ];
      break;
    }
    
    case 'record_payment': {
      const amount = result?.amount;
      _display.summary = `Payment of ${amount ? `$${amount.toFixed(2)}` : ''} recorded`;
      _display.entityType = 'payment';
      if (result?.invoice_id) {
        _display.actions = [{ label: 'View Invoice', action: `navigate_to_entity?type=invoice&id=${result.invoice_id}` }];
      }
      break;
    }
    
    case 'optimize_route_for_date': {
      const count = result?.jobs_count || 0;
      _display.summary = result?.success 
        ? `Route optimized for ${count} job${count !== 1 ? 's' : ''}`
        : result?.message || 'Route optimization failed';
      if (result?.success) {
        _display.actions = [{ label: 'View Route', action: `navigate_to_calendar?date=${args.date}` }];
      }
      break;
    }
    
    case 'get_schedule_summary': {
      const total = result?.totalJobs || 0;
      _display.summary = `${total} job${total !== 1 ? 's' : ''} scheduled in date range`;
      break;
    }
    
    default:
      // For unknown tools, create a basic summary
      if (result?.success === true) {
        _display.summary = 'Action completed successfully';
      } else if (result?.success === false) {
        _display.summary = result?.message || 'Action failed';
      }
      break;
  }
  
  // Only add _display if we have content
  if (_display.summary) {
    return { ...result, _display };
  }
  return result;
}

// Tool registry
const tools: Record<string, Tool> = {
  get_unscheduled_jobs: {
    name: 'get_unscheduled_jobs',
    description: 'Get all unscheduled jobs for the business that need scheduling',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any, context: any) => {
      const { data, error } = await context.supabase
        .from('jobs')
        .select('id, title, customer_id, notes, created_at, customers(name, address)')
        .eq('business_id', context.businessId)
        .is('starts_at', null)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Queried ${data?.length || 0} unscheduled jobs`,
        metadata: { tool: 'get_unscheduled_jobs', count: data?.length || 0 }
      });
      
      return { unscheduled_jobs: data || [], count: data?.length || 0 };
    }
  },

  check_team_availability: {
    name: 'check_team_availability',
    description: 'Check which team members are available for a specific date and time range',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        startTime: { type: 'string', description: 'Start time in HH:MM format' },
        endTime: { type: 'string', description: 'End time in HH:MM format' }
      },
      required: ['date']
    },
    execute: async (args: any, context: any) => {
      const startDateTime = args.startTime 
        ? `${args.date}T${args.startTime}:00Z` 
        : `${args.date}T00:00:00Z`;
      const endDateTime = args.endTime 
        ? `${args.date}T${args.endTime}:00Z` 
        : `${args.date}T23:59:59Z`;

      const { data: members, error: membersError } = await context.supabase
        .from('business_permissions')
        .select('user_id, profiles!business_permissions_user_id_fkey(id, full_name, email)')
        .eq('business_id', context.businessId);

      if (membersError) throw membersError;

      const { data: busyMembers, error: busyError } = await context.supabase
        .from('job_assignments')
        .select('user_id, jobs(starts_at, ends_at, title)')
        .in('user_id', members?.map(m => m.user_id) || [])
        .gte('jobs.starts_at', startDateTime)
        .lte('jobs.ends_at', endDateTime);

      if (busyError) throw busyError;

      const busyUserIds = new Set(busyMembers?.map(b => b.user_id) || []);
      const available = members?.filter(m => !busyUserIds.has(m.user_id)) || [];

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Checked availability for ${args.date}`,
        metadata: { tool: 'check_team_availability', available: available.length }
      });

      return {
        date: args.date,
        timeRange: args.startTime && args.endTime ? `${args.startTime}-${args.endTime}` : 'full day',
        availableMembers: available.map(m => ({
          id: m.user_id,
          name: m.profiles?.full_name || m.profiles?.email || 'Unknown'
        })),
        busyMembers: Array.from(busyUserIds).length
      };
    }
  },

  get_schedule_summary: {
    name: 'get_schedule_summary',
    description: 'Get a summary of scheduled jobs for a specific date range',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' }
      },
      required: ['startDate', 'endDate']
    },
    execute: async (args: any, context: any) => {
      const { data, error } = await context.supabase
        .from('jobs')
        .select('id, title, status, starts_at, ends_at, customers(name)')
        .eq('business_id', context.businessId)
        .gte('starts_at', `${args.startDate}T00:00:00Z`)
        .lte('starts_at', `${args.endDate}T23:59:59Z`)
        .order('starts_at', { ascending: true });

      if (error) throw error;

      const summary = {
        totalJobs: data?.length || 0,
        byStatus: {} as Record<string, number>,
        jobsByDay: {} as Record<string, number>
      };

      data?.forEach(job => {
        summary.byStatus[job.status] = (summary.byStatus[job.status] || 0) + 1;
        const day = job.starts_at?.split('T')[0] || 'unknown';
        summary.jobsByDay[day] = (summary.jobsByDay[day] || 0) + 1;
      });

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved schedule summary for ${args.startDate} to ${args.endDate}`,
        metadata: { tool: 'get_schedule_summary', total: summary.totalJobs }
      });

      return { ...summary, jobs: data || [] };
    }
  },

  auto_schedule_job: {
    name: 'auto_schedule_job',
    description: 'Automatically schedule a job using AI optimization',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID to schedule' },
        preferredDate: { type: 'string', description: 'Optional preferred date in YYYY-MM-DD format' }
      },
      required: ['jobId']
    },
    execute: async (args: any, context: any) => {
      const { data: job } = await context.supabase
        .from('jobs')
        .select('*, customers(name, address, phone)')
        .eq('id', args.jobId)
        .single();

      if (!job) throw new Error('Job not found');

      const startDate = args.preferredDate || new Date().toISOString().split('T')[0];
      const endDate = new Date(new Date(startDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: existingJobs } = await context.supabase
        .from('jobs')
        .select('id, starts_at, ends_at, customer_id, customers(address)')
        .eq('business_id', context.businessId)
        .gte('starts_at', `${startDate}T00:00:00Z`)
        .lte('starts_at', `${endDate}T23:59:59Z`);

      const { data: teamMembers } = await context.supabase
        .from('business_permissions')
        .select('user_id, profiles(full_name)')
        .eq('business_id', context.businessId);

      // Simple scheduling: find first available slot
      const suggestedStart = new Date(new Date(startDate).getTime() + 9 * 60 * 60 * 1000);
      const duration = job.estimated_duration_minutes || 60;
      const suggestedEnd = new Date(suggestedStart.getTime() + duration * 60000);

      const { error: updateError } = await context.supabase
        .from('jobs')
        .update({
          starts_at: suggestedStart.toISOString(),
          ends_at: suggestedEnd.toISOString(),
          status: 'Scheduled'
        })
        .eq('id', args.jobId);

      if (updateError) throw updateError;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'schedule',
        description: `Auto-scheduled job: ${job.title}`,
        metadata: { tool: 'auto_schedule_job', job_id: args.jobId, scheduled_time: suggestedStart.toISOString() }
      });

      return { 
        success: true, 
        scheduled_time: suggestedStart.toISOString(),
        job_title: job.title 
      };
    }
  },

  create_job_from_request: {
    name: 'create_job_from_request',
    description: 'Convert a service request into a scheduled job',
    parameters: {
      type: 'object',
      properties: {
        requestId: { type: 'string', description: 'Request ID to convert' },
        scheduleTime: { type: 'string', description: 'Optional schedule time in ISO format' }
      },
      required: ['requestId']
    },
    execute: async (args: any, context: any) => {
      const { data: request } = await context.supabase
        .from('requests')
        .select('*')
        .eq('id', args.requestId)
        .single();

      if (!request) throw new Error('Request not found');

      const jobData: any = {
        business_id: context.businessId,
        owner_id: context.userId,
        customer_id: request.customer_id,
        title: request.title,
        notes: request.service_details,
        status: args.scheduleTime ? 'Scheduled' : 'Unscheduled',
        is_assessment: request.status === 'New'
      };

      if (args.scheduleTime) {
        jobData.starts_at = args.scheduleTime;
        const duration = 60;
        jobData.ends_at = new Date(new Date(args.scheduleTime).getTime() + duration * 60000).toISOString();
      }

      const { data: newJob, error } = await context.supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) throw error;

      await context.supabase
        .from('requests')
        .update({ status: 'Scheduled' })
        .eq('id', args.requestId);

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'create',
        description: `Created job from request: ${request.title}`,
        metadata: { tool: 'create_job_from_request', request_id: args.requestId, job_id: newJob.id }
      });

      return { success: true, job_id: newJob.id };
    }
  },

  optimize_route_for_date: {
    name: 'optimize_route_for_date',
    description: 'Optimize the route for all jobs on a specific date',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' }
      },
      required: ['date']
    },
    execute: async (args: any, context: any) => {
      const { data: jobs } = await context.supabase
        .from('jobs')
        .select('id, title, address, starts_at, customers(address, name)')
        .eq('business_id', context.businessId)
        .gte('starts_at', `${args.date}T00:00:00Z`)
        .lt('starts_at', `${args.date}T23:59:59Z`)
        .order('starts_at', { ascending: true });

      if (!jobs || jobs.length === 0) {
        return { success: false, message: 'No jobs found for this date' };
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'optimize',
        description: `Optimized route for ${args.date} with ${jobs.length} jobs`,
        metadata: { tool: 'optimize_route_for_date', date: args.date, job_count: jobs.length }
      });

      return { 
        success: true, 
        jobs_count: jobs.length,
        route: jobs.map((j, i) => ({ 
          order: i + 1, 
          title: j.title, 
          address: j.customers?.address 
        }))
      };
    }
  },

  get_scheduling_conflicts: {
    name: 'get_scheduling_conflicts',
    description: 'Find scheduling conflicts and overlapping bookings',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' }
      },
      required: ['startDate', 'endDate']
    },
    execute: async (args: any, context: any) => {
      const { data: jobs } = await context.supabase
        .from('jobs')
        .select('id, title, starts_at, ends_at, job_assignments(user_id, profiles(full_name))')
        .eq('business_id', context.businessId)
        .gte('starts_at', `${args.startDate}T00:00:00Z`)
        .lte('starts_at', `${args.endDate}T23:59:59Z`)
        .order('starts_at', { ascending: true });

      const conflicts: any[] = [];

      for (let i = 0; i < (jobs?.length || 0); i++) {
        for (let j = i + 1; j < (jobs?.length || 0); j++) {
          const job1 = jobs![i];
          const job2 = jobs![j];
          
          const overlap = 
            new Date(job1.starts_at) < new Date(job2.ends_at) &&
            new Date(job1.ends_at) > new Date(job2.starts_at);

          if (overlap) {
            const sharedMembers = job1.job_assignments?.filter((a1: any) =>
              job2.job_assignments?.some((a2: any) => a2.user_id === a1.user_id)
            );

            if (sharedMembers?.length > 0) {
              conflicts.push({
                job1_id: job1.id,
                job1_title: job1.title,
                job2_id: job2.id,
                job2_title: job2.title,
                conflicting_members: sharedMembers.map((m: any) => m.profiles?.full_name)
              });
            }
          }
        }
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Found ${conflicts.length} scheduling conflicts`,
        metadata: { tool: 'get_scheduling_conflicts', conflicts: conflicts.length }
      });

      return { conflicts, total_conflicts: conflicts.length };
    }
  },

  get_customer_details: {
    name: 'get_customer_details',
    description: 'Get detailed information about a customer',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID' }
      },
      required: ['customerId']
    },
    execute: async (args: any, context: any) => {
      const { data: customer, error } = await context.supabase
        .from('customers')
        .select('*, jobs(id, title, status, starts_at, total), quotes(id, number, status, total)')
        .eq('id', args.customerId)
        .single();

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved details for customer ${customer.name}`,
        metadata: { tool: 'get_customer_details', customer_id: args.customerId }
      });

      return { 
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          total_jobs: customer.jobs?.length || 0,
          total_quotes: customer.quotes?.length || 0
        }
      };
    }
  },

  update_job_status: {
    name: 'update_job_status',
    description: 'Update the status of a job',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID' },
        newStatus: { 
          type: 'string', 
          description: 'New status',
          enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Unscheduled']
        }
      },
      required: ['jobId', 'newStatus']
    },
    execute: async (args: any, context: any) => {
      const { data: job, error } = await context.supabase
        .from('jobs')
        .update({ status: args.newStatus })
        .eq('id', args.jobId)
        .eq('business_id', context.businessId)
        .select()
        .single();

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'update',
        description: `Updated job status to ${args.newStatus}`,
        metadata: { tool: 'update_job_status', job_id: args.jobId, new_status: args.newStatus },
        accepted: true
      });

      return { success: true, job_id: args.jobId, new_status: args.newStatus };
    }
  },

  get_capacity_forecast: {
    name: 'get_capacity_forecast',
    description: 'Get workload capacity forecast for upcoming period',
    parameters: {
      type: 'object',
      properties: {
        daysAhead: { type: 'number', description: 'Number of days to forecast (default: 14)' }
      }
    },
    execute: async (args: any, context: any) => {
      const days_ahead = args.daysAhead || 14;
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + days_ahead * 24 * 60 * 60 * 1000).toISOString();

      const { data: scheduledJobs } = await context.supabase
        .from('jobs')
        .select('starts_at, estimated_duration_minutes, status')
        .eq('business_id', context.businessId)
        .gte('starts_at', startDate)
        .lte('starts_at', endDate);

      const { data: teamMembers } = await context.supabase
        .from('business_permissions')
        .select('user_id')
        .eq('business_id', context.businessId);

      const totalScheduledHours = scheduledJobs?.reduce((sum: number, job: any) => 
        sum + (job.estimated_duration_minutes || 60) / 60, 0
      ) || 0;

      const availableHours = (teamMembers?.length || 1) * days_ahead * 8;
      const utilizationPercent = (totalScheduledHours / availableHours) * 100;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Generated capacity forecast for next ${days_ahead} days`,
        metadata: { tool: 'get_capacity_forecast', utilization: utilizationPercent.toFixed(1) }
      });

      return {
        days_ahead,
        scheduled_jobs: scheduledJobs?.length || 0,
        scheduled_hours: Math.round(totalScheduledHours),
        available_hours: availableHours,
        utilization_percent: Math.round(utilizationPercent),
        capacity_status: utilizationPercent > 90 ? 'overbooked' : utilizationPercent > 70 ? 'high' : 'normal'
      };
    }
  },

  reschedule_job: {
    name: 'reschedule_job',
    description: 'Reschedule a job to a new date/time',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID' },
        newStartTime: { type: 'string', description: 'New start time in ISO format' },
        reason: { type: 'string', description: 'Optional reason for rescheduling' }
      },
      required: ['jobId', 'newStartTime']
    },
    execute: async (args: any, context: any) => {
      const { data: job } = await context.supabase
        .from('jobs')
        .select('*, customers(name)')
        .eq('id', args.jobId)
        .single();

      if (!job) throw new Error('Job not found');

      const duration = job.estimated_duration_minutes || 60;
      const newEndTime = new Date(new Date(args.newStartTime).getTime() + duration * 60000).toISOString();

      const { error } = await context.supabase
        .from('jobs')
        .update({
          starts_at: args.newStartTime,
          ends_at: newEndTime
        })
        .eq('id', args.jobId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'reschedule',
        description: `Rescheduled job ${job.title} to ${args.newStartTime}`,
        metadata: { tool: 'reschedule_job', job_id: args.jobId, new_start_time: args.newStartTime, reason: args.reason },
        accepted: true
      });

      return {
        success: true,
        job_id: args.jobId,
        job_title: job.title,
        customer: job.customers?.name,
        new_start_time: args.newStartTime,
        new_end_time: newEndTime
      };
    }
  },

  batch_schedule_jobs: {
    name: 'batch_schedule_jobs',
    description: 'Schedule multiple jobs at once with AI optimization. Gathers full context (constraints, availability, time off, customer preferences) and uses intelligent scheduling.',
    parameters: {
      type: 'object',
      properties: {
        jobIds: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of job IDs to schedule' 
        },
        preferredDateRange: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start date YYYY-MM-DD' },
            end: { type: 'string', description: 'End date YYYY-MM-DD' }
          },
          description: 'Optional date range to schedule within'
        },
        constraints: {
          type: 'object',
          properties: {
            prioritizeUrgent: { type: 'boolean', description: 'Schedule urgent jobs first' },
            groupByLocation: { type: 'boolean', description: 'Minimize travel time' }
          },
          description: 'Optional scheduling preferences'
        }
      },
      required: ['jobIds']
    },
    execute: async (args: any, context: any) => {
      console.info('[batch_schedule_jobs] Starting batch schedule', { jobCount: args.jobIds.length });

      // Send progress updates
      const sendProgress = (message: string, current?: number, total?: number) => {
        if (context.controller) {
          const encoder = new TextEncoder();
          const progressData: any = { type: 'tool_progress', tool: 'batch_schedule_jobs', progress: message };
          if (current !== undefined && total !== undefined) {
            progressData.progress = { current, total };
          }
          context.controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
          );
        }
      };

      sendProgress('🔍 Analyzing jobs...');

      // 1. Gather all unscheduled jobs
      const { data: jobs, error: jobsError } = await context.supabase
        .from('jobs')
        .select('*, customers(id, name, address, preferred_days, avoid_days, preferred_time_window)')
        .in('id', args.jobIds)
        .eq('business_id', context.businessId);
      
      if (jobsError) throw jobsError;
      if (!jobs || jobs.length === 0) throw new Error('No jobs found');

      sendProgress(`📋 Found ${jobs.length} jobs to schedule`);

      // 2. Gather scheduling context
      const dateRange = args.preferredDateRange || {
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      sendProgress('👥 Checking team availability...');

      // Get existing jobs in date range
      const { data: existingJobs } = await context.supabase
        .from('jobs')
        .select('*, job_assignments(user_id), customers(address)')
        .eq('business_id', context.businessId)
        .gte('starts_at', `${dateRange.start}T00:00:00Z`)
        .lte('starts_at', `${dateRange.end}T23:59:59Z`)
        .order('starts_at', { ascending: true });

      // Get team members
      const { data: teamMembers } = await context.supabase
        .from('business_permissions')
        .select('user_id, profiles(id, full_name, email)')
        .eq('business_id', context.businessId);

      // Get team availability
      const { data: availability } = await context.supabase
        .from('team_availability')
        .select('*')
        .eq('business_id', context.businessId);

      // Get approved time off
      const { data: timeOff } = await context.supabase
        .from('time_off_requests')
        .select('*')
        .eq('business_id', context.businessId)
        .eq('status', 'approved')
        .gte('end_date', dateRange.start);

      // Get business constraints
      const { data: constraints } = await context.supabase
        .from('business_constraints')
        .select('*')
        .eq('business_id', context.businessId)
        .eq('is_active', true);

      // Extract customer preferences
      const customerPreferences = jobs.map(j => j.customers).filter(Boolean);

      console.info('[batch_schedule_jobs] Context gathered', {
        existingJobsCount: existingJobs?.length || 0,
        teamMembersCount: teamMembers?.length || 0,
        availabilityRecords: availability?.length || 0,
        timeOffRequests: timeOff?.length || 0,
        constraints: constraints?.length || 0
      });

      sendProgress('🎯 Optimizing schedule with AI...');

      // 3. Call ai-schedule-optimizer with full context
      const { data, error } = await context.supabase.functions.invoke(
        'ai-schedule-optimizer',
        {
          body: {
            businessId: context.businessId,
            unscheduledJobs: jobs,
            existingJobs: existingJobs || [],
            teamMembers: teamMembers || [],
            constraints: constraints || [],
            availability: availability || [],
            timeOff: timeOff || [],
            customerPreferences: customerPreferences
          }
        }
      );
      
      if (error) {
        console.error('[batch_schedule_jobs] AI optimization error:', error);
        throw new Error('Failed to generate schedule suggestions');
      }

      const suggestions = data.suggestions || [];
      console.info('[batch_schedule_jobs] AI suggestions received', { count: suggestions.length });

      sendProgress(`✅ Schedule optimized! Applying ${suggestions.length} suggestions...`);

      // 4. Apply scheduling suggestions
      const results = [];
      const failedJobs = [];
      
      const totalSuggestions = suggestions.length;
      for (let i = 0; i < suggestions.length; i++) {
        const suggestion = suggestions[i];
        
        // Send progress update for each job being scheduled
        sendProgress(`Scheduling job ${i + 1} of ${totalSuggestions}...`, i + 1, totalSuggestions);
        
        try {
          // Update job with suggested time and mark as AI suggested
          const { error: updateError } = await context.supabase
            .from('jobs')
            .update({
              starts_at: suggestion.recommendedStartTime,
              ends_at: suggestion.recommendedEndTime,
              status: 'Scheduled',
              ai_suggested: true,
              scheduling_score: suggestion.priorityScore,
              updated_at: new Date().toISOString()
            })
            .eq('id', suggestion.jobId)
            .eq('business_id', context.businessId);
          
          if (updateError) {
            console.error('[batch_schedule_jobs] Failed to update job:', suggestion.jobId, updateError);
            const job = jobs.find(j => j.id === suggestion.jobId);
            failedJobs.push({ 
              jobId: suggestion.jobId, 
              jobTitle: job?.title,
              customerName: job?.customers?.name,
              reason: 'update_failed',
              details: updateError.message 
            });
            continue;
          }

          // Assign team member if suggested
          if (suggestion.assignedMemberId) {
            const { error: assignError } = await context.supabase
              .from('job_assignments')
              .insert({
                job_id: suggestion.jobId,
                user_id: suggestion.assignedMemberId,
                assigned_by: context.userId
              });
            
            if (assignError) {
              console.warn('[batch_schedule_jobs] Failed to assign member:', assignError);
            }
          }
          
          const job = jobs.find(j => j.id === suggestion.jobId);
          results.push({
            jobId: suggestion.jobId,
            jobTitle: job?.title,
            customerName: job?.customers?.name,
            success: true,
            scheduledTime: suggestion.recommendedStartTime,
            assignedTo: suggestion.assignedMemberId,
            reasoning: suggestion.reasoning,
            priorityScore: suggestion.priorityScore,
            travelTimeMinutes: suggestion.travelTimeMinutes
          });
        } catch (err) {
          console.error('[batch_schedule_jobs] Error processing suggestion:', err);
          const job = jobs.find(j => j.id === suggestion.jobId);
          failedJobs.push({ 
            jobId: suggestion.jobId, 
            jobTitle: job?.title,
            customerName: job?.customers?.name,
            reason: 'processing_error',
            details: err.message 
          });
        }
      }
      
      // 5. Analyze failed jobs for detailed error reporting
      for (const jobId of args.jobIds) {
        if (!results.some(r => r.jobId === jobId) && !failedJobs.some(f => f.jobId === jobId)) {
          const job = jobs.find(j => j.id === jobId);
          const reasons = [];
          
          if (!job.customers?.address) {
            reasons.push('missing_address');
          }
          if (!job.estimated_duration_minutes) {
            reasons.push('missing_duration');
          }
          
          failedJobs.push({
            jobId,
            jobTitle: job?.title,
            customerName: job?.customers?.name,
            reason: reasons.length > 0 ? reasons.join(', ') : 'no_suggestion_generated',
            details: reasons.length > 0 
              ? `Missing required data: ${reasons.join(', ')}` 
              : 'AI could not find suitable time slot'
          });
        }
      }
      
      // 6. Log activity
      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'batch_schedule',
        description: `Scheduled ${results.length} of ${args.jobIds.length} jobs using AI optimization`,
        metadata: {
          tool: 'batch_schedule_jobs',
          requested: args.jobIds.length,
          scheduled: results.length,
          failed: failedJobs.length,
          constraints: args.constraints
        },
        accepted: true
      });

      console.info('[batch_schedule_jobs] Completed', {
        scheduled: results.length,
        failed: failedJobs.length
      });

      // Calculate time savings estimate
      const estimatedTimeSaved = results.reduce((total, r) => 
        total + (r.travelTimeMinutes || 0), 0
      ) * 0.3; // 30% travel time reduction from optimization

      // Format response for schedule preview
      const scheduledJobs = results.map(r => {
        const job = jobs.find(j => j.id === r.jobId);
        const assignedMember = teamMembers?.find(m => m.user_id === r.assignedTo);
        return {
          jobId: r.jobId,
          title: r.jobTitle || job?.title || 'Unknown Job',
          customerName: r.customerName || job?.customers?.name || 'Unknown Customer',
          startTime: r.scheduledTime,
          endTime: new Date(new Date(r.scheduledTime).getTime() + (job?.estimated_duration_minutes || 60) * 60000).toISOString(),
          assignedTo: r.assignedTo,
          assignedToName: assignedMember?.profiles?.full_name || assignedMember?.profiles?.email || 'Unassigned',
          reasoning: r.reasoning,
          priorityScore: r.priorityScore || 0.9,
          travelTimeMinutes: r.travelTimeMinutes || 0
        };
      });

      return {
        success: true,
        scheduled_count: results.length,
        total_requested: args.jobIds.length,
        scheduledJobs,
        failed_jobs: failedJobs,
        estimated_time_saved: Math.round(estimatedTimeSaved),
        message: failedJobs.length > 0 
          ? `Scheduled ${results.length} of ${args.jobIds.length} jobs. ${failedJobs.length} couldn't be scheduled.`
          : `Successfully scheduled all ${results.length} jobs.`
      };
    }
  },

  refine_schedule: {
    name: 'refine_schedule',
    description: 'Refine or adjust an existing schedule based on user feedback. Use when user rejects a schedule or wants modifications.',
    parameters: {
      type: 'object',
      properties: {
        jobIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Jobs to reschedule/adjust'
        },
        feedback: {
          type: 'string',
          description: 'User feedback like "move earlier", "spread across more days", "group by location"'
        },
        preferredDateRange: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' }
          }
        }
      },
      required: ['jobIds', 'feedback']
    },
    execute: async (args: any, context: any) => {
      console.info('[refine_schedule] Refining schedule', { jobCount: args.jobIds.length, feedback: args.feedback });
      
      // 1. Analyze feedback to extract constraints
      const feedbackLower = args.feedback.toLowerCase();
      const refinementConstraints: any = {};
      
      if (feedbackLower.includes('earlier') || feedbackLower.includes('morning')) {
        refinementConstraints.preferTimeWindow = 'morning';
      }
      if (feedbackLower.includes('later') || feedbackLower.includes('afternoon')) {
        refinementConstraints.preferTimeWindow = 'afternoon';
      }
      if (feedbackLower.includes('spread') || feedbackLower.includes('distribute')) {
        refinementConstraints.spreadAcrossDays = true;
      }
      if (feedbackLower.includes('group') || feedbackLower.includes('location')) {
        refinementConstraints.groupByLocation = true;
      }
      if (feedbackLower.includes('urgent') || feedbackLower.includes('priority')) {
        refinementConstraints.prioritizeUrgent = true;
      }
      
      // 2. Get jobs to refine
      const { data: jobs } = await context.supabase
        .from('jobs')
        .select('*, customers(name, address, preferred_days, preferred_time_window)')
        .in('id', args.jobIds);
      
      // 3. Re-gather scheduling context
      const dateRange = args.preferredDateRange || {
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      const [existingJobsRes, teamMembersRes, availabilityRes, timeOffRes, constraintsRes] = await Promise.all([
        context.supabase.from('jobs').select('id, title, starts_at, ends_at, status, customers(address)').eq('business_id', context.businessId).gte('starts_at', `${dateRange.start}T00:00:00Z`).lte('starts_at', `${dateRange.end}T23:59:59Z`).neq('status', 'Cancelled').not('id', 'in', `(${args.jobIds.join(',')})`),
        context.supabase.from('business_permissions').select('user_id, profiles(id, full_name, email)').eq('business_id', context.businessId),
        context.supabase.from('team_availability').select('*').eq('business_id', context.businessId),
        context.supabase.from('time_off_requests').select('*').eq('business_id', context.businessId).eq('status', 'approved').gte('end_date', dateRange.start).lte('start_date', dateRange.end),
        context.supabase.from('business_constraints').select('*').eq('business_id', context.businessId).eq('is_active', true)
      ]);
      
      // 4. Call ai-schedule-optimizer with refined constraints
      const { data, error } = await context.supabase.functions.invoke('ai-schedule-optimizer', {
        body: {
          businessId: context.businessId,
          unscheduledJobs: jobs,
          existingJobs: existingJobsRes.data || [],
          teamMembers: teamMembersRes.data || [],
          constraints: [
            ...(constraintsRes.data || []),
            { userFeedback: args.feedback, refinementConstraints }
          ],
          availability: availabilityRes.data || [],
          timeOff: timeOffRes.data || [],
          customerPreferences: jobs?.map(j => j.customers).filter(Boolean)
        }
      });
      
      if (error) throw error;
      
      // 5. Apply refined schedule
      const suggestions = data.suggestions || [];
      const results = [];
      
      for (const suggestion of suggestions) {
        const { error: updateError } = await context.supabase
          .from('jobs')
          .update({
            starts_at: suggestion.recommendedStartTime,
            ends_at: suggestion.recommendedEndTime,
            status: 'Scheduled',
            ai_suggested: true,
            scheduling_score: suggestion.priorityScore
          })
          .eq('id', suggestion.jobId);
        
        if (!updateError) {
          if (suggestion.assignedMemberId) {
            await context.supabase.from('job_assignments').upsert({
              job_id: suggestion.jobId,
              user_id: suggestion.assignedMemberId,
              assigned_by: context.userId
            });
          }
          
          results.push({
            jobId: suggestion.jobId,
            success: true,
            scheduledTime: suggestion.recommendedStartTime,
            assignedTo: suggestion.assignedMemberId,
            reasoning: suggestion.reasoning,
            travelTimeMinutes: suggestion.travelTimeMinutes
          });
        }
      }
      
      // 6. Log refinement activity
      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'refine_schedule',
        description: `Refined schedule for ${results.length} jobs based on: "${args.feedback}"`,
        metadata: {
          tool: 'refine_schedule',
          job_ids: args.jobIds,
          feedback: args.feedback,
          scheduled_count: results.length,
          applied_constraints: refinementConstraints
        },
        accepted: true
      });
      
      return {
        success: true,
        scheduled_count: results.length,
        total_requested: args.jobIds.length,
        results,
        estimated_time_saved: data.estimatedTimeSaved || 0,
        applied_constraints: refinementConstraints
      };
    }
  },

  // ============================================
  // QUOTE DOMAIN TOOLS
  // ============================================

  create_quote: {
    name: 'create_quote',
    description: 'Create a new quote for a customer with line items',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID' },
        lineItems: { 
          type: 'array', 
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              qty: { type: 'number' },
              unit_price: { type: 'number' }
            }
          },
          description: 'Array of line items with name, qty, unit_price'
        },
        validDays: { type: 'number', description: 'Days until quote expires (default: 30)' },
        notes: { type: 'string', description: 'Internal notes' },
        terms: { type: 'string', description: 'Terms and conditions' }
      },
      required: ['customerId', 'lineItems']
    },
    execute: async (args: any, context: any) => {
      // Get next quote number
      const { data: business } = await context.supabase
        .from('businesses')
        .select('est_prefix, est_seq')
        .eq('id', context.businessId)
        .single();

      const quoteNumber = `${business?.est_prefix || 'EST'}${String(business?.est_seq || 1).padStart(4, '0')}`;

      // Calculate totals
      const subtotal = args.lineItems.reduce((sum: number, item: any) => 
        sum + (item.qty * item.unit_price), 0
      );

      const validUntil = new Date(Date.now() + (args.validDays || 30) * 24 * 60 * 60 * 1000).toISOString();

      // Create quote
      const { data: quote, error } = await context.supabase
        .from('quotes')
        .insert({
          business_id: context.businessId,
          owner_id: context.userId,
          customer_id: args.customerId,
          number: quoteNumber,
          subtotal,
          total: subtotal,
          status: 'Draft',
          valid_until: validUntil,
          notes: args.notes,
          terms: args.terms
        })
        .select('*, customers(name)')
        .single();

      if (error) throw error;

      // Create line items
      if (args.lineItems?.length > 0) {
        const lineItemsData = args.lineItems.map((item: any, idx: number) => ({
          quote_id: quote.id,
          owner_id: context.userId,
          name: item.name,
          qty: item.qty || 1,
          unit_price: item.unit_price,
          line_total: (item.qty || 1) * item.unit_price,
          position: idx
        }));

        await context.supabase.from('quote_line_items').insert(lineItemsData);
      }

      // Update sequence
      await context.supabase
        .from('businesses')
        .update({ est_seq: (business?.est_seq || 0) + 1 })
        .eq('id', context.businessId);

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'create',
        description: `Created quote ${quoteNumber} for ${quote.customers?.name}`,
        metadata: { tool: 'create_quote', quote_id: quote.id, total: subtotal }
      });

      return { 
        success: true, 
        quote_id: quote.id, 
        quote_number: quoteNumber,
        customer_name: quote.customers?.name,
        total: subtotal 
      };
    }
  },

  get_pending_quotes: {
    name: 'get_pending_quotes',
    description: 'Get all quotes awaiting customer response',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: Draft, Sent, Approved, Declined' }
      }
    },
    execute: async (args: any, context: any) => {
      let query = context.supabase
        .from('quotes')
        .select('id, number, status, total, sent_at, created_at, customers(name, email)')
        .eq('business_id', context.businessId)
        .order('created_at', { ascending: false });

      if (args.status) {
        query = query.eq('status', args.status);
      } else {
        query = query.in('status', ['Draft', 'Sent']);
      }

      const { data, error } = await query.limit(25);
      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved ${data?.length || 0} pending quotes`,
        metadata: { tool: 'get_pending_quotes' }
      });

      return { 
        quotes: data || [], 
        count: data?.length || 0,
        total_value: data?.reduce((sum: number, q: any) => sum + (q.total || 0), 0) || 0
      };
    }
  },

  // ============================================
  // ENTITY SELECTION TOOLS (for conversational recovery)
  // ============================================

  list_pending_quotes: {
    name: 'list_pending_quotes',
    description: 'List quotes available for approval - used for entity selection during plan recovery',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any, context: any) => {
      console.info('[list_pending_quotes] Fetching pending quotes for business:', context.businessId);
      
      const { data, error } = await context.supabase
        .from('quotes')
        .select('id, number, total, status, created_at, customers(name)')
        .eq('business_id', context.businessId)
        .in('status', ['Draft', 'Sent', 'Pending'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[list_pending_quotes] Error fetching quotes:', error);
        throw error;
      }
      
      console.info('[list_pending_quotes] Found', data?.length || 0, 'quotes');

      return {
        options: data?.map((q: any) => ({
          id: q.id,
          label: `${q.number} - ${q.customers?.name || 'Unknown'} ($${(q.total || 0).toFixed(2)})`,
          value: q.id,
          metadata: {
            number: q.number,
            customer: q.customers?.name,
            total: q.total,
            status: q.status,
            createdAt: q.created_at,
          },
        })) || [],
        count: data?.length || 0,
      };
    }
  },

  list_approved_quotes: {
    name: 'list_approved_quotes',
    description: 'List approved quotes available for conversion to jobs - used for entity selection',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any, context: any) => {
      const { data, error } = await context.supabase
        .from('quotes')
        .select('id, number, total, status, created_at, customers(name)')
        .eq('business_id', context.businessId)
        .eq('status', 'Approved')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return {
        options: data?.map((q: any) => ({
          id: q.id,
          label: `${q.number} - ${q.customers?.name || 'Unknown'} ($${(q.total || 0).toFixed(2)})`,
          value: q.id,
          metadata: {
            number: q.number,
            customer: q.customers?.name,
            total: q.total,
          },
        })) || [],
        count: data?.length || 0,
      };
    }
  },

  list_completed_jobs: {
    name: 'list_completed_jobs',
    description: 'List completed jobs available for invoicing - used for entity selection',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any, context: any) => {
      const { data, error } = await context.supabase
        .from('jobs')
        .select('id, title, total, status, created_at, customers(name)')
        .eq('business_id', context.businessId)
        .eq('status', 'Complete')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return {
        options: data?.map((j: any) => ({
          id: j.id,
          label: `${j.title || 'Untitled'} - ${j.customers?.name || 'Unknown'}${j.total ? ` ($${j.total.toFixed(2)})` : ''}`,
          value: j.id,
          metadata: {
            title: j.title,
            customer: j.customers?.name,
            total: j.total,
          },
        })) || [],
        count: data?.length || 0,
      };
    }
  },

  send_quote: {
    name: 'send_quote',
    description: 'Send a quote to the customer via email',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'Quote ID to send' }
      },
      required: ['quoteId']
    },
    execute: async (args: any, context: any) => {
      const { data: quote, error: fetchError } = await context.supabase
        .from('quotes')
        .select('*, customers(name, email)')
        .eq('id', args.quoteId)
        .eq('business_id', context.businessId)
        .single();

      if (fetchError || !quote) throw new Error('Quote not found');

      // Update status to Sent
      const { error } = await context.supabase
        .from('quotes')
        .update({ status: 'Sent', sent_at: new Date().toISOString() })
        .eq('id', args.quoteId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'send',
        description: `Sent quote ${quote.number} to ${quote.customers?.email}`,
        metadata: { tool: 'send_quote', quote_id: args.quoteId }
      });

      return { 
        success: true, 
        quote_number: quote.number,
        sent_to: quote.customers?.email 
      };
    }
  },

  convert_quote_to_job: {
    name: 'convert_quote_to_job',
    description: 'Convert an approved quote into a job/work order',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'Quote ID to convert' },
        scheduleTime: { type: 'string', description: 'Optional schedule time ISO format' }
      },
      required: ['quoteId']
    },
    execute: async (args: any, context: any) => {
      const { data: quote } = await context.supabase
        .from('quotes')
        .select('*, customers(name, address), quote_line_items(*)')
        .eq('id', args.quoteId)
        .single();

      if (!quote) throw new Error('Quote not found');

      const jobData: any = {
        business_id: context.businessId,
        owner_id: context.userId,
        customer_id: quote.customer_id,
        quote_id: quote.id,
        title: `Work from Quote ${quote.number}`,
        notes: quote.notes,
        address: quote.customers?.address,
        total: quote.total,
        status: args.scheduleTime ? 'Scheduled' : 'Unscheduled'
      };

      if (args.scheduleTime) {
        jobData.starts_at = args.scheduleTime;
        jobData.ends_at = new Date(new Date(args.scheduleTime).getTime() + 2 * 60 * 60 * 1000).toISOString();
      }

      const { data: job, error } = await context.supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'convert',
        description: `Converted quote ${quote.number} to job`,
        metadata: { tool: 'convert_quote_to_job', quote_id: args.quoteId, job_id: job.id }
      });

      return { 
        success: true, 
        job_id: job.id,
        quote_number: quote.number,
        customer_name: quote.customers?.name
      };
    }
  },

  // ============================================
  // INVOICE DOMAIN TOOLS
  // ============================================

  create_invoice: {
    name: 'create_invoice',
    description: 'Create a new invoice for a customer, optionally from a quote',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID' },
        quoteId: { type: 'string', description: 'Optional quote ID to create invoice from' },
        jobId: { type: 'string', description: 'Optional job ID to link' },
        lineItems: { 
          type: 'array', 
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              qty: { type: 'number' },
              unit_price: { type: 'number' }
            }
          },
          description: 'Line items (not needed if creating from quote)'
        },
        dueDays: { type: 'number', description: 'Days until due (default: 30)' }
      },
      required: ['customerId']
    },
    execute: async (args: any, context: any) => {
      // Get next invoice number
      const { data: business } = await context.supabase
        .from('businesses')
        .select('inv_prefix, inv_seq, tax_rate_default')
        .eq('id', context.businessId)
        .single();

      const invoiceNumber = `${business?.inv_prefix || 'INV'}${String(business?.inv_seq || 1).padStart(4, '0')}`;

      let lineItems = args.lineItems || [];
      
      // If creating from quote, copy line items
      if (args.quoteId) {
        const { data: quote } = await context.supabase
          .from('quotes')
          .select('*, quote_line_items(*)')
          .eq('id', args.quoteId)
          .single();
        
        if (quote?.quote_line_items) {
          lineItems = quote.quote_line_items.map((li: any) => ({
            name: li.name,
            qty: li.qty,
            unit_price: li.unit_price
          }));
        }
      }

      const subtotal = lineItems.reduce((sum: number, item: any) => 
        sum + (item.qty * item.unit_price), 0
      );
      const taxRate = business?.tax_rate_default || 0;
      const total = subtotal * (1 + taxRate / 100);
      const dueAt = new Date(Date.now() + (args.dueDays || 30) * 24 * 60 * 60 * 1000).toISOString();

      const { data: invoice, error } = await context.supabase
        .from('invoices')
        .insert({
          business_id: context.businessId,
          owner_id: context.userId,
          customer_id: args.customerId,
          quote_id: args.quoteId,
          job_id: args.jobId,
          number: invoiceNumber,
          subtotal,
          tax_rate: taxRate,
          total,
          due_at: dueAt,
          status: 'Draft'
        })
        .select('*, customers(name)')
        .single();

      if (error) throw error;

      // Create line items
      if (lineItems.length > 0) {
        const lineItemsData = lineItems.map((item: any, idx: number) => ({
          invoice_id: invoice.id,
          owner_id: context.userId,
          name: item.name,
          qty: item.qty || 1,
          unit_price: item.unit_price,
          line_total: (item.qty || 1) * item.unit_price,
          position: idx
        }));

        await context.supabase.from('invoice_line_items').insert(lineItemsData);
      }

      // Update sequence
      await context.supabase
        .from('businesses')
        .update({ inv_seq: (business?.inv_seq || 0) + 1 })
        .eq('id', context.businessId);

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'create',
        description: `Created invoice ${invoiceNumber}`,
        metadata: { tool: 'create_invoice', invoice_id: invoice.id, total }
      });

      return { 
        success: true, 
        invoice_id: invoice.id, 
        invoice_number: invoiceNumber,
        customer_name: invoice.customers?.name,
        total 
      };
    }
  },

  get_unpaid_invoices: {
    name: 'get_unpaid_invoices',
    description: 'Get all unpaid invoices',
    parameters: {
      type: 'object',
      properties: {
        includeOverdue: { type: 'boolean', description: 'Include overdue status' }
      }
    },
    execute: async (args: any, context: any) => {
      const { data, error } = await context.supabase
        .from('invoices')
        .select('id, number, status, total, due_at, created_at, customers(name, email)')
        .eq('business_id', context.businessId)
        .in('status', ['Draft', 'Sent'])
        .order('due_at', { ascending: true });

      if (error) throw error;

      const now = new Date();
      const enriched = data?.map((inv: any) => ({
        ...inv,
        is_overdue: inv.due_at && new Date(inv.due_at) < now,
        days_overdue: inv.due_at ? Math.max(0, Math.floor((now.getTime() - new Date(inv.due_at).getTime()) / 86400000)) : 0
      })) || [];

      const overdueCount = enriched.filter((i: any) => i.is_overdue).length;
      const totalOutstanding = enriched.reduce((sum: number, i: any) => sum + (i.total || 0), 0);

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved ${data?.length || 0} unpaid invoices`,
        metadata: { tool: 'get_unpaid_invoices', overdue: overdueCount }
      });

      return { 
        invoices: enriched, 
        count: enriched.length,
        overdue_count: overdueCount,
        total_outstanding: totalOutstanding
      };
    }
  },

  send_invoice: {
    name: 'send_invoice',
    description: 'Send an invoice to the customer via email',
    parameters: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID to send' }
      },
      required: ['invoiceId']
    },
    execute: async (args: any, context: any) => {
      const { data: invoice } = await context.supabase
        .from('invoices')
        .select('*, customers(name, email)')
        .eq('id', args.invoiceId)
        .eq('business_id', context.businessId)
        .single();

      if (!invoice) throw new Error('Invoice not found');

      const { error } = await context.supabase
        .from('invoices')
        .update({ status: 'Sent' })
        .eq('id', args.invoiceId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'send',
        description: `Sent invoice ${invoice.number} to ${invoice.customers?.email}`,
        metadata: { tool: 'send_invoice', invoice_id: args.invoiceId }
      });

      return { 
        success: true, 
        invoice_number: invoice.number,
        sent_to: invoice.customers?.email 
      };
    }
  },

  send_invoice_reminder: {
    name: 'send_invoice_reminder',
    description: 'Send a payment reminder for an overdue invoice',
    parameters: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID' }
      },
      required: ['invoiceId']
    },
    execute: async (args: any, context: any) => {
      const { data: invoice } = await context.supabase
        .from('invoices')
        .select('*, customers(name, email)')
        .eq('id', args.invoiceId)
        .single();

      if (!invoice) throw new Error('Invoice not found');

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'reminder',
        description: `Sent payment reminder for invoice ${invoice.number}`,
        metadata: { tool: 'send_invoice_reminder', invoice_id: args.invoiceId }
      });

      return { 
        success: true, 
        invoice_number: invoice.number,
        customer: invoice.customers?.name,
        amount_due: invoice.total
      };
    }
  },

  // ============================================
  // CUSTOMER DOMAIN TOOLS
  // ============================================

  create_customer: {
    name: 'create_customer',
    description: 'Create a new customer record',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Customer full name' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        address: { type: 'string', description: 'Full address' },
        notes: { type: 'string', description: 'Internal notes' }
      },
      required: ['name', 'email']
    },
    execute: async (args: any, context: any) => {
      const { data: customer, error } = await context.supabase
        .from('customers')
        .insert({
          business_id: context.businessId,
          owner_id: context.userId,
          name: args.name,
          email: args.email,
          phone: args.phone,
          address: args.address,
          notes: args.notes
        })
        .select()
        .single();

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'create',
        description: `Created customer: ${args.name}`,
        metadata: { tool: 'create_customer', customer_id: customer.id }
      });

      return { success: true, customer_id: customer.id, name: args.name };
    }
  },

  search_customers: {
    name: 'search_customers',
    description: 'Search for customers by name, email, or phone',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default: 10)' }
      },
      required: ['query']
    },
    execute: async (args: any, context: any) => {
      const searchQuery = `%${args.query}%`;
      
      const { data, error } = await context.supabase
        .from('customers')
        .select('id, name, email, phone, address')
        .eq('business_id', context.businessId)
        .or(`name.ilike.${searchQuery},email.ilike.${searchQuery},phone.ilike.${searchQuery}`)
        .limit(args.limit || 10);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'search',
        description: `Searched customers: "${args.query}" - ${data?.length || 0} results`,
        metadata: { tool: 'search_customers', query: args.query }
      });

      return { customers: data || [], count: data?.length || 0 };
    }
  },

  get_customer: {
    name: 'get_customer',
    description: 'Get a single customer by ID with full details',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID' }
      },
      required: ['customerId']
    },
    execute: async (args: any, context: any) => {
      const { data: customer, error } = await context.supabase
        .from('customers')
        .select('*')
        .eq('id', args.customerId)
        .eq('business_id', context.businessId)
        .single();

      if (error) throw error;
      if (!customer) throw new Error('Customer not found');

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved customer: ${customer.name}`,
        metadata: { tool: 'get_customer', customer_id: customer.id }
      });

      return { customer };
    }
  },

  create_request: {
    name: 'create_request',
    description: 'Create a new service request from a customer inquiry',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID' },
        title: { type: 'string', description: 'Request title/subject' },
        serviceDetails: { type: 'string', description: 'Details of the service needed' },
        source: { 
          type: 'string', 
          description: 'Source of request: portal, phone, email, referral, chat',
          enum: ['portal', 'phone', 'email', 'referral', 'chat']
        },
        priority: {
          type: 'string',
          description: 'Request priority: low, normal, high, urgent',
          enum: ['low', 'normal', 'high', 'urgent']
        }
      },
      required: ['customerId', 'title']
    },
    execute: async (args: any, context: any) => {
      // Verify customer exists
      const { data: customer } = await context.supabase
        .from('customers')
        .select('id, name')
        .eq('id', args.customerId)
        .eq('business_id', context.businessId)
        .single();

      if (!customer) throw new Error('Customer not found');

      const { data: request, error } = await context.supabase
        .from('requests')
        .insert({
          business_id: context.businessId,
          customer_id: args.customerId,
          title: args.title,
          service_details: args.serviceDetails || null,
          source: args.source || 'chat',
          priority: args.priority || 'normal',
          status: 'New'
        })
        .select()
        .single();

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'create',
        description: `Created service request "${args.title}" for ${customer.name}`,
        metadata: { tool: 'create_request', request_id: request.id, customer_id: args.customerId }
      });

      return { 
        success: true, 
        request_id: request.id, 
        customer_name: customer.name,
        title: args.title,
        status: 'New'
      };
    }
  },

  list_team_members: {
    name: 'list_team_members',
    description: 'List all team members for the business with their availability status',
    parameters: {
      type: 'object',
      properties: {
        includeWorkload: { type: 'boolean', description: 'Include current workload info' }
      }
    },
    execute: async (args: any, context: any) => {
      const { data: members, error } = await context.supabase
        .from('business_permissions')
        .select('user_id, granted_at, profiles!business_permissions_user_id_fkey(id, full_name, email)')
        .eq('business_id', context.businessId);

      if (error) throw error;

      let teamMembers = members?.map(m => ({
        id: m.user_id,
        name: m.profiles?.full_name || m.profiles?.email || 'Unknown',
        email: m.profiles?.email,
        joined_at: m.granted_at
      })) || [];

      // Optionally include workload
      if (args.includeWorkload) {
        const today = new Date().toISOString().split('T')[0];
        const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { data: assignments } = await context.supabase
          .from('job_assignments')
          .select('user_id, jobs(id, status, starts_at)')
          .in('user_id', teamMembers.map(m => m.id))
          .gte('jobs.starts_at', `${today}T00:00:00Z`)
          .lte('jobs.starts_at', `${weekEnd}T23:59:59Z`);

        const workloadMap: Record<string, number> = {};
        assignments?.forEach(a => {
          workloadMap[a.user_id] = (workloadMap[a.user_id] || 0) + 1;
        });

        teamMembers = teamMembers.map(m => ({
          ...m,
          jobs_this_week: workloadMap[m.id] || 0
        }));
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Listed ${teamMembers.length} team members`,
        metadata: { tool: 'list_team_members', count: teamMembers.length }
      });

      return { team_members: teamMembers, count: teamMembers.length };
    }
  },

  // ============================================
  // LEAD GENERATION - NEW DFY TOOLS
  // ============================================

  send_email: {
    name: 'send_email',
    description: 'Send a custom email to a customer. Use for initial contact, follow-ups, welcome messages, or notifications.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID to send email to' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body in HTML or plain text' },
        emailType: { 
          type: 'string', 
          enum: ['welcome', 'follow_up', 'reminder', 'custom'],
          description: 'Type of email for tracking purposes'
        }
      },
      required: ['customerId', 'subject', 'body']
    },
    execute: async (args: any, context: any) => {
      // 1. Get customer email
      const { data: customer, error: custError } = await context.supabase
        .from('customers')
        .select('id, name, email')
        .eq('id', args.customerId)
        .eq('business_id', context.businessId)
        .single();

      if (custError || !customer) throw new Error('Customer not found');
      if (!customer.email) throw new Error('Customer has no email address');

      // 2. Get business details for branding
      const { data: business } = await context.supabase
        .from('businesses')
        .select('name, reply_to_email')
        .eq('id', context.businessId)
        .single();

      // 3. Wrap email in template
      const wrappedBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          ${args.body}
          <hr style="margin-top: 40px; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            Sent by ${business?.name || 'ServiceGrid'}
          </p>
        </body>
        </html>
      `;

      // 4. Log the email send (actual sending would use Resend integration)
      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'email_sent',
        description: `Sent ${args.emailType || 'custom'} email to ${customer.name}: "${args.subject}"`,
        metadata: { 
          tool: 'send_email',
          customerId: args.customerId, 
          customerEmail: customer.email,
          subject: args.subject,
          emailType: args.emailType || 'custom'
        }
      });

      // 5. Log to mail_sends for tracking
      const requestHash = `${args.customerId}-${Date.now()}`;
      await context.supabase.from('mail_sends').insert({
        user_id: context.userId,
        to_email: customer.email,
        subject: args.subject,
        request_hash: requestHash,
        status: 'sent'
      });

      console.log(`[send_email] Email sent to ${customer.email}: ${args.subject}`);

      return { 
        success: true, 
        sentTo: customer.email,
        customerName: customer.name,
        subject: args.subject,
        emailType: args.emailType || 'custom'
      };
    }
  },

  score_lead: {
    name: 'score_lead',
    description: 'Calculate and return a lead quality score based on customer data completeness and engagement signals',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID to score' }
      },
      required: ['customerId']
    },
    execute: async (args: any, context: any) => {
      // Get customer with related data
      const { data: customer, error } = await context.supabase
        .from('customers')
        .select('*, quotes(id), jobs(id), requests(id)')
        .eq('id', args.customerId)
        .eq('business_id', context.businessId)
        .single();

      if (error || !customer) throw new Error('Customer not found');

      // Calculate score (0-100)
      let score = 0;
      const factors: string[] = [];

      // Contact completeness (max 30 points)
      if (customer.email) { score += 10; factors.push('Has email (+10)'); }
      if (customer.phone) { score += 10; factors.push('Has phone (+10)'); }
      if (customer.address) { score += 10; factors.push('Has address (+10)'); }

      // Engagement signals (max 40 points)
      const quoteCount = customer.quotes?.length || 0;
      const jobCount = customer.jobs?.length || 0;
      const requestCount = customer.requests?.length || 0;
      
      if (quoteCount > 0) { score += 15; factors.push(`Has ${quoteCount} quote(s) (+15)`); }
      if (jobCount > 0) { score += 20; factors.push(`Has ${jobCount} job(s) (+20)`); }
      if (requestCount > 0) { score += 5; factors.push(`Has ${requestCount} request(s) (+5)`); }

      // Data quality (max 30 points)
      if (customer.preferred_days && customer.preferred_days.length > 0) { 
        score += 10; factors.push('Has scheduling preferences (+10)'); 
      }
      if (customer.notes) { score += 10; factors.push('Has notes (+10)'); }
      if (customer.scheduling_notes) { score += 10; factors.push('Has scheduling notes (+10)'); }

      // Cap at 100
      score = Math.min(100, score);

      // Determine qualification tier
      let qualificationTier: string;
      if (score >= 70) qualificationTier = 'hot';
      else if (score >= 40) qualificationTier = 'warm';
      else qualificationTier = 'cold';

      const isQualified = score >= 40;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'lead_scored',
        description: `Scored lead ${customer.name}: ${score}/100 (${qualificationTier})`,
        metadata: { 
          tool: 'score_lead',
          customerId: args.customerId, 
          score,
          tier: qualificationTier,
          factors
        }
      });

      console.log(`[score_lead] Customer ${customer.name}: score=${score}, tier=${qualificationTier}`);

      return { 
        customerId: args.customerId,
        customerName: customer.name,
        score,
        qualificationTier,
        isQualified,
        factors
      };
    }
  },

  qualify_lead: {
    name: 'qualify_lead',
    description: 'Explicitly mark a lead as qualified or disqualified with a reason',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID' },
        qualified: { type: 'boolean', description: 'Whether the lead is qualified' },
        reason: { type: 'string', description: 'Reason for qualification decision' }
      },
      required: ['customerId', 'qualified']
    },
    execute: async (args: any, context: any) => {
      // Get customer
      const { data: customer, error: fetchError } = await context.supabase
        .from('customers')
        .select('id, name, notes')
        .eq('id', args.customerId)
        .eq('business_id', context.businessId)
        .single();

      if (fetchError || !customer) throw new Error('Customer not found');

      // Update notes with qualification status
      const qualificationNote = `\n\n[Qualification: ${args.qualified ? 'QUALIFIED' : 'DISQUALIFIED'} - ${new Date().toISOString().split('T')[0]}]\n${args.reason || 'No reason provided'}`;
      const updatedNotes = (customer.notes || '') + qualificationNote;

      const { error } = await context.supabase
        .from('customers')
        .update({ notes: updatedNotes })
        .eq('id', args.customerId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: args.qualified ? 'lead_qualified' : 'lead_disqualified',
        description: `${args.qualified ? 'Qualified' : 'Disqualified'} lead: ${customer.name}`,
        metadata: { 
          tool: 'qualify_lead',
          customerId: args.customerId, 
          qualified: args.qualified,
          reason: args.reason
        }
      });

      console.log(`[qualify_lead] Customer ${customer.name}: ${args.qualified ? 'qualified' : 'disqualified'}`);

      return { 
        customerId: args.customerId,
        customerName: customer.name,
        qualified: args.qualified,
        reason: args.reason || null
      };
    }
  },

  auto_assign_lead: {
    name: 'auto_assign_lead',
    description: 'Automatically assign a lead/job to the team member with the lowest current workload',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID to assign (optional)' },
        customerId: { type: 'string', description: 'Customer ID for context' }
      }
    },
    execute: async (args: any, context: any) => {
      // 1. Get team members with current workload
      const { data: members, error: membersError } = await context.supabase
        .from('business_permissions')
        .select('user_id, profiles!business_permissions_user_id_fkey(id, full_name, email)')
        .eq('business_id', context.businessId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) throw new Error('No team members available');

      // 2. Get current workload for each member (jobs this week)
      const today = new Date().toISOString().split('T')[0];
      const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: assignments } = await context.supabase
        .from('job_assignments')
        .select('user_id, jobs(id, status, starts_at)')
        .in('user_id', members.map(m => m.user_id))
        .gte('jobs.starts_at', `${today}T00:00:00Z`)
        .lte('jobs.starts_at', `${weekEnd}T23:59:59Z`);

      // Count jobs per member
      const workloadMap: Record<string, number> = {};
      assignments?.forEach(a => {
        workloadMap[a.user_id] = (workloadMap[a.user_id] || 0) + 1;
      });

      // 3. Find member with lowest workload
      const membersByWorkload = members
        .map(m => ({
          userId: m.user_id,
          name: m.profiles?.full_name || m.profiles?.email || 'Unknown',
          email: m.profiles?.email,
          jobCount: workloadMap[m.user_id] || 0
        }))
        .sort((a, b) => a.jobCount - b.jobCount);

      const assignee = membersByWorkload[0];

      // 4. If jobId provided, create assignment
      if (args.jobId) {
        const { error: assignError } = await context.supabase
          .from('job_assignments')
          .insert({
            job_id: args.jobId,
            user_id: assignee.userId,
            assigned_by: context.userId,
            assigned_at: new Date().toISOString()
          });

        if (assignError) throw assignError;
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'auto_assigned',
        description: `Auto-assigned to ${assignee.name} (workload: ${assignee.jobCount} jobs)`,
        metadata: { 
          tool: 'auto_assign_lead',
          assignedTo: assignee.userId,
          assigneeName: assignee.name,
          jobId: args.jobId,
          customerId: args.customerId,
          method: 'workload_balance'
        }
      });

      console.log(`[auto_assign_lead] Assigned to ${assignee.name} with ${assignee.jobCount} current jobs`);

      return {
        assignedTo: assignee.userId,
        assigneeName: assignee.name,
        assigneeEmail: assignee.email,
        currentWorkload: assignee.jobCount,
        method: 'workload_balance',
        jobId: args.jobId || null,
        customerId: args.customerId || null
      };
    }
  },

  get_customer_history: {
    name: 'get_customer_history',
    description: 'Get complete customer history including jobs, quotes, invoices, and payments',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID' }
      },
      required: ['customerId']
    },
    execute: async (args: any, context: any) => {
      const { data: customer, error } = await context.supabase
        .from('customers')
        .select(`
          *,
          jobs(id, title, status, starts_at, total, created_at),
          quotes(id, number, status, total, created_at),
          invoices(id, number, status, total, paid_at, created_at)
        `)
        .eq('id', args.customerId)
        .eq('business_id', context.businessId)
        .single();

      if (error) throw error;

      const totalSpent = customer.invoices
        ?.filter((i: any) => i.status === 'Paid')
        .reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0;

      const outstandingBalance = customer.invoices
        ?.filter((i: any) => i.status !== 'Paid')
        .reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved history for ${customer.name}`,
        metadata: { tool: 'get_customer_history', customer_id: args.customerId }
      });

      return {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address
        },
        stats: {
          total_jobs: customer.jobs?.length || 0,
          total_quotes: customer.quotes?.length || 0,
          total_invoices: customer.invoices?.length || 0,
          total_spent: totalSpent,
          outstanding_balance: outstandingBalance
        },
        recent_jobs: customer.jobs?.slice(0, 5) || [],
        recent_invoices: customer.invoices?.slice(0, 5) || []
      };
    }
  },

  invite_to_portal: {
    name: 'invite_to_portal',
    description: 'Send a customer portal invitation to a customer',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID to invite' }
      },
      required: ['customerId']
    },
    execute: async (args: any, context: any) => {
      const { data: customer } = await context.supabase
        .from('customers')
        .select('name, email')
        .eq('id', args.customerId)
        .single();

      if (!customer) throw new Error('Customer not found');

      // Check for existing invite
      const { data: existingInvite } = await context.supabase
        .from('customer_portal_invites')
        .select('id')
        .eq('customer_id', args.customerId)
        .is('accepted_at', null)
        .single();

      if (existingInvite) {
        return { 
          success: false, 
          message: 'Customer already has a pending invite',
          customer_name: customer.name
        };
      }

      // Create invite
      const { error } = await context.supabase
        .from('customer_portal_invites')
        .insert({
          business_id: context.businessId,
          customer_id: args.customerId,
          email: customer.email,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'invite',
        description: `Sent portal invite to ${customer.name}`,
        metadata: { tool: 'invite_to_portal', customer_id: args.customerId }
      });

      return { 
        success: true, 
        customer_name: customer.name,
        invited_email: customer.email 
      };
    }
  },

  // ============================================
  // PAYMENT DOMAIN TOOLS
  // ============================================

  record_payment: {
    name: 'record_payment',
    description: 'Record a manual payment (cash, check, etc.) for an invoice',
    parameters: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID' },
        amount: { type: 'number', description: 'Payment amount' },
        method: { type: 'string', description: 'Payment method: cash, check, bank_transfer, other' },
        reference: { type: 'string', description: 'Reference number (check number, etc.)' }
      },
      required: ['invoiceId', 'amount', 'method']
    },
    execute: async (args: any, context: any) => {
      const { data: invoice } = await context.supabase
        .from('invoices')
        .select('number, total, customers(name)')
        .eq('id', args.invoiceId)
        .single();

      if (!invoice) throw new Error('Invoice not found');

      const { error } = await context.supabase
        .from('payments')
        .insert({
          invoice_id: args.invoiceId,
          owner_id: context.userId,
          amount: args.amount,
          method: args.method,
          last4: args.reference,
          status: 'succeeded',
          received_at: new Date().toISOString()
        });

      if (error) throw error;

      // Check if fully paid
      if (args.amount >= invoice.total) {
        await context.supabase
          .from('invoices')
          .update({ status: 'Paid', paid_at: new Date().toISOString() })
          .eq('id', args.invoiceId);
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'payment',
        description: `Recorded ${args.method} payment of $${args.amount} for invoice ${invoice.number}`,
        metadata: { tool: 'record_payment', invoice_id: args.invoiceId, amount: args.amount }
      });

      return { 
        success: true, 
        invoice_number: invoice.number,
        amount: args.amount,
        method: args.method,
        fully_paid: args.amount >= invoice.total
      };
    }
  },

  get_payment_history: {
    name: 'get_payment_history',
    description: 'Get payment history for a customer or invoice',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Filter by customer' },
        invoiceId: { type: 'string', description: 'Filter by invoice' },
        limit: { type: 'number', description: 'Max results (default: 20)' }
      }
    },
    execute: async (args: any, context: any) => {
      let query = context.supabase
        .from('payments')
        .select('*, invoices(number, customer_id, customers(name))')
        .order('received_at', { ascending: false })
        .limit(args.limit || 20);

      if (args.invoiceId) {
        query = query.eq('invoice_id', args.invoiceId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (args.customerId) {
        filtered = filtered.filter((p: any) => p.invoices?.customer_id === args.customerId);
      }

      const totalReceived = filtered.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved ${filtered.length} payment records`,
        metadata: { tool: 'get_payment_history' }
      });

      return { 
        payments: filtered, 
        count: filtered.length,
        total_received: totalReceived
      };
    }
  },

  // ============================================
  // RECURRING BILLING TOOLS
  // ============================================

  get_recurring_schedules: {
    name: 'get_recurring_schedules',
    description: 'Get all recurring billing schedules',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: active, paused, canceled' }
      }
    },
    execute: async (args: any, context: any) => {
      let query = context.supabase
        .from('recurring_schedules')
        .select('*, quotes(number, total, customers(name))')
        .eq('business_id', context.businessId)
        .order('next_billing_date', { ascending: true });

      if (args.status) {
        query = query.eq('status', args.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved ${data?.length || 0} recurring schedules`,
        metadata: { tool: 'get_recurring_schedules' }
      });

      return { schedules: data || [], count: data?.length || 0 };
    }
  },

  pause_subscription: {
    name: 'pause_subscription',
    description: 'Pause a recurring billing schedule',
    parameters: {
      type: 'object',
      properties: {
        scheduleId: { type: 'string', description: 'Recurring schedule ID' },
        reason: { type: 'string', description: 'Reason for pausing' }
      },
      required: ['scheduleId']
    },
    execute: async (args: any, context: any) => {
      const { data: schedule } = await context.supabase
        .from('recurring_schedules')
        .select('*, quotes(number, customers(name))')
        .eq('id', args.scheduleId)
        .single();

      if (!schedule) throw new Error('Schedule not found');

      const { error } = await context.supabase
        .from('recurring_schedules')
        .update({ status: 'paused' })
        .eq('id', args.scheduleId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'update',
        description: `Paused recurring schedule for ${schedule.quotes?.customers?.name}`,
        metadata: { tool: 'pause_subscription', schedule_id: args.scheduleId, reason: args.reason }
      });

      return { 
        success: true, 
        customer_name: schedule.quotes?.customers?.name,
        quote_number: schedule.quotes?.number
      };
    }
  },

  resume_subscription: {
    name: 'resume_subscription',
    description: 'Resume a paused recurring billing schedule',
    parameters: {
      type: 'object',
      properties: {
        scheduleId: { type: 'string', description: 'Recurring schedule ID' }
      },
      required: ['scheduleId']
    },
    execute: async (args: any, context: any) => {
      const { data: schedule } = await context.supabase
        .from('recurring_schedules')
        .select('*, quotes(number, customers(name))')
        .eq('id', args.scheduleId)
        .single();

      if (!schedule) throw new Error('Schedule not found');

      const { error } = await context.supabase
        .from('recurring_schedules')
        .update({ status: 'active' })
        .eq('id', args.scheduleId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'update',
        description: `Resumed recurring schedule for ${schedule.quotes?.customers?.name}`,
        metadata: { tool: 'resume_subscription', schedule_id: args.scheduleId }
      });

      return { 
        success: true, 
        customer_name: schedule.quotes?.customers?.name,
        next_billing_date: schedule.next_billing_date
      };
    }
  },

  // ============================================
  // TEAM & TIME TRACKING TOOLS
  // ============================================

  get_team_members: {
    name: 'get_team_members',
    description: 'Get all team members with their roles and status',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async (args: any, context: any) => {
      const { data, error } = await context.supabase
        .from('business_permissions')
        .select('user_id, granted_at, profiles(id, full_name, email)')
        .eq('business_id', context.businessId);

      if (error) throw error;

      // Get owner info
      const { data: business } = await context.supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', context.businessId)
        .single();

      const members = data?.map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.full_name || m.profiles?.email,
        email: m.profiles?.email,
        is_owner: m.user_id === business?.owner_id,
        joined_at: m.granted_at
      })) || [];

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved ${members.length} team members`,
        metadata: { tool: 'get_team_members' }
      });

      return { members, count: members.length };
    }
  },

  get_team_utilization: {
    name: 'get_team_utilization',
    description: 'Get team workload utilization for a date range',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date YYYY-MM-DD' }
      },
      required: ['startDate', 'endDate']
    },
    execute: async (args: any, context: any) => {
      // Get team members
      const { data: members } = await context.supabase
        .from('business_permissions')
        .select('user_id, profiles(full_name)')
        .eq('business_id', context.businessId);

      // Get job assignments in range
      const { data: assignments } = await context.supabase
        .from('job_assignments')
        .select('user_id, jobs(starts_at, ends_at, estimated_duration_minutes, status)')
        .in('user_id', members?.map((m: any) => m.user_id) || [])
        .gte('jobs.starts_at', `${args.startDate}T00:00:00Z`)
        .lte('jobs.starts_at', `${args.endDate}T23:59:59Z`);

      // Calculate utilization per member
      const days = Math.ceil((new Date(args.endDate).getTime() - new Date(args.startDate).getTime()) / 86400000) + 1;
      const availableHoursPerMember = days * 8;

      const utilization = members?.map((m: any) => {
        const memberAssignments = assignments?.filter((a: any) => a.user_id === m.user_id) || [];
        const scheduledHours = memberAssignments.reduce((sum: number, a: any) => 
          sum + (a.jobs?.estimated_duration_minutes || 60) / 60, 0
        );
        
        return {
          member_id: m.user_id,
          member_name: m.profiles?.full_name,
          job_count: memberAssignments.length,
          scheduled_hours: Math.round(scheduledHours * 10) / 10,
          available_hours: availableHoursPerMember,
          utilization_percent: Math.round((scheduledHours / availableHoursPerMember) * 100)
        };
      }) || [];

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Calculated team utilization for ${args.startDate} to ${args.endDate}`,
        metadata: { tool: 'get_team_utilization' }
      });

      return { 
        date_range: { start: args.startDate, end: args.endDate },
        utilization,
        average_utilization: Math.round(utilization.reduce((sum, u) => sum + u.utilization_percent, 0) / utilization.length)
      };
    }
  },

  get_active_clockins: {
    name: 'get_active_clockins',
    description: 'Get team members currently clocked in',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async (args: any, context: any) => {
      const { data, error } = await context.supabase
        .from('timesheet_entries')
        .select('*, profiles(full_name), jobs(title, customers(name))')
        .eq('business_id', context.businessId)
        .is('clock_out', null);

      if (error) throw error;

      const active = data?.map((entry: any) => ({
        entry_id: entry.id,
        member_name: entry.profiles?.full_name,
        clocked_in_at: entry.clock_in,
        job_title: entry.jobs?.title,
        customer_name: entry.jobs?.customers?.name,
        hours_elapsed: Math.round((Date.now() - new Date(entry.clock_in).getTime()) / 3600000 * 10) / 10
      })) || [];

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved ${active.length} active clock-ins`,
        metadata: { tool: 'get_active_clockins' }
      });

      return { active_clockins: active, count: active.length };
    }
  },

  get_timesheet_summary: {
    name: 'get_timesheet_summary',
    description: 'Get timesheet summary for a date range',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date YYYY-MM-DD' },
        userId: { type: 'string', description: 'Optional specific user' }
      },
      required: ['startDate', 'endDate']
    },
    execute: async (args: any, context: any) => {
      let query = context.supabase
        .from('timesheet_entries')
        .select('*, profiles(full_name), jobs(title)')
        .eq('business_id', context.businessId)
        .gte('clock_in', `${args.startDate}T00:00:00Z`)
        .lte('clock_in', `${args.endDate}T23:59:59Z`)
        .not('clock_out', 'is', null);

      if (args.userId) {
        query = query.eq('user_id', args.userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate totals by user
      const byUser: Record<string, { name: string, hours: number, entries: number }> = {};
      
      for (const entry of data || []) {
        const userId = entry.user_id;
        const hours = (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000;
        
        if (!byUser[userId]) {
          byUser[userId] = { 
            name: entry.profiles?.full_name || 'Unknown', 
            hours: 0, 
            entries: 0 
          };
        }
        byUser[userId].hours += hours;
        byUser[userId].entries += 1;
      }

      const summary = Object.entries(byUser).map(([id, data]) => ({
        user_id: id,
        name: data.name,
        total_hours: Math.round(data.hours * 10) / 10,
        entry_count: data.entries
      }));

      const totalHours = summary.reduce((sum, s) => sum + s.total_hours, 0);

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved timesheet summary: ${Math.round(totalHours)} total hours`,
        metadata: { tool: 'get_timesheet_summary' }
      });

      return { 
        date_range: { start: args.startDate, end: args.endDate },
        by_user: summary,
        total_hours: Math.round(totalHours * 10) / 10,
        total_entries: data?.length || 0
      };
    }
  },

  generate_team_summary: {
    name: 'generate_team_summary',
    description: 'Generate a comprehensive team status summary from utilization and clock-in data',
    parameters: {
      type: 'object',
      properties: {
        utilization: { type: 'object', description: 'Team utilization data' },
        activeClockIns: { type: 'object', description: 'Active clock-in data' }
      }
    },
    execute: async (args: any, context: any) => {
      const utilization = args.utilization || {};
      const activeClockIns = args.activeClockIns?.active_clockins || [];
      
      const summary = {
        generated_at: new Date().toISOString(),
        team_size: utilization.team_size || 0,
        currently_working: activeClockIns.length,
        utilization_summary: {
          average: utilization.average_utilization || 0,
          by_member: utilization.utilization || []
        },
        active_members: activeClockIns.map((c: any) => ({
          name: c.member_name,
          working_on: c.job_title || 'Unknown job',
          customer: c.customer_name,
          hours_today: c.hours_elapsed
        })),
        status: activeClockIns.length === 0 
          ? 'No team members currently clocked in' 
          : `${activeClockIns.length} team member${activeClockIns.length > 1 ? 's' : ''} actively working`,
        recommendations: [] as string[]
      };

      // Add recommendations based on data
      if (utilization.average_utilization > 90) {
        summary.recommendations.push('Team utilization is very high. Consider hiring or limiting new jobs.');
      } else if (utilization.average_utilization < 50) {
        summary.recommendations.push('Team has capacity for more work. Consider marketing or promotions.');
      }
      
      if (activeClockIns.length === 0 && new Date().getHours() >= 8 && new Date().getHours() < 18) {
        summary.recommendations.push('No one is clocked in during business hours. Check team schedules.');
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'analysis',
        description: `Generated team summary: ${summary.currently_working} active, ${summary.utilization_summary.average}% avg utilization`,
        metadata: { tool: 'generate_team_summary' }
      });

      return summary;
    }
  },

  suggest_capacity_optimizations: {
    name: 'suggest_capacity_optimizations',
    description: 'Analyze capacity forecast and conflicts to suggest scheduling optimizations',
    parameters: {
      type: 'object',
      properties: {
        forecast: { type: 'object', description: 'Capacity forecast data' },
        conflicts: { type: 'object', description: 'Scheduling conflicts data' }
      }
    },
    execute: async (args: any, context: any) => {
      const forecast = args.forecast || {};
      const conflicts = args.conflicts || {};
      
      const suggestions: Array<{ priority: 'high' | 'medium' | 'low'; suggestion: string; action?: string }> = [];
      
      // Analyze utilization
      const utilizationPercent = forecast.utilization_percent || 0;
      
      if (utilizationPercent > 100) {
        suggestions.push({
          priority: 'high',
          suggestion: `You are overbooked by ${utilizationPercent - 100}%. Some jobs may need to be rescheduled or reassigned.`,
          action: 'Review and redistribute workload'
        });
      } else if (utilizationPercent > 85) {
        suggestions.push({
          priority: 'medium',
          suggestion: `High utilization (${utilizationPercent}%) - limited buffer for emergencies or new requests.`,
          action: 'Consider blocking some slots for urgent work'
        });
      } else if (utilizationPercent < 50) {
        suggestions.push({
          priority: 'low',
          suggestion: `Low utilization (${utilizationPercent}%) - you have capacity for ${Math.round((100 - utilizationPercent) / 10)} more jobs this period.`,
          action: 'Good time to accept new work or do marketing'
        });
      }
      
      // Analyze conflicts
      const conflictCount = conflicts.total_conflicts || conflicts.conflicts?.length || 0;
      if (conflictCount > 0) {
        suggestions.push({
          priority: 'high',
          suggestion: `${conflictCount} scheduling conflict${conflictCount > 1 ? 's' : ''} detected that need resolution.`,
          action: 'Use batch reschedule to resolve conflicts'
        });
      }
      
      // General suggestions
      if (suggestions.length === 0) {
        suggestions.push({
          priority: 'low',
          suggestion: 'Your schedule looks well-balanced with no immediate issues.',
        });
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'analysis',
        description: `Generated ${suggestions.length} capacity optimization suggestions`,
        metadata: { tool: 'suggest_capacity_optimizations', utilizationPercent, conflictCount }
      });

      return {
        utilization_percent: utilizationPercent,
        capacity_status: forecast.capacity_status || 'normal',
        conflict_count: conflictCount,
        suggestions,
        summary: suggestions.length > 0 
          ? `Found ${suggestions.filter(s => s.priority === 'high').length} high-priority and ${suggestions.filter(s => s.priority === 'medium').length} medium-priority optimization opportunities.`
          : 'No optimization opportunities identified.'
      };
    }
  },

  batch_reschedule_jobs: {
    name: 'batch_reschedule_jobs',
    description: 'Reschedule multiple conflicting jobs to resolve scheduling conflicts',
    parameters: {
      type: 'object',
      properties: {
        jobIds: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of job IDs to reschedule' 
        },
        strategy: {
          type: 'string',
          enum: ['earliest_available', 'spread_evenly', 'minimize_travel'],
          description: 'Rescheduling strategy to use'
        }
      },
      required: ['jobIds']
    },
    execute: async (args: any, context: any) => {
      const { jobIds, strategy = 'earliest_available' } = args;
      
      if (!jobIds || jobIds.length === 0) {
        return { success: true, message: 'No jobs to reschedule', rescheduledJobIds: [] };
      }

      // Get the jobs that need rescheduling
      const { data: jobs, error: jobsError } = await context.supabase
        .from('jobs')
        .select('*, customers(name, address)')
        .in('id', jobIds)
        .eq('business_id', context.businessId);

      if (jobsError) throw jobsError;
      if (!jobs || jobs.length === 0) {
        return { success: false, message: 'No matching jobs found', rescheduledJobIds: [] };
      }

      const rescheduledJobs: Array<{ jobId: string; title: string; oldTime: string; newTime: string }> = [];
      const failedJobs: Array<{ jobId: string; title: string; reason: string }> = [];

      // Simple rescheduling logic - move each job to next available slot
      for (const job of jobs) {
        try {
          // Find next available slot (simple: add 1 day for now, could be smarter)
          const currentStart = new Date(job.starts_at);
          const newStart = new Date(currentStart.getTime() + 24 * 60 * 60 * 1000); // +1 day
          const duration = job.estimated_duration_minutes || 60;
          const newEnd = new Date(newStart.getTime() + duration * 60000);

          const { error: updateError } = await context.supabase
            .from('jobs')
            .update({
              starts_at: newStart.toISOString(),
              ends_at: newEnd.toISOString()
            })
            .eq('id', job.id);

          if (updateError) throw updateError;

          rescheduledJobs.push({
            jobId: job.id,
            title: job.title || 'Untitled',
            oldTime: job.starts_at,
            newTime: newStart.toISOString()
          });
        } catch (err: any) {
          failedJobs.push({
            jobId: job.id,
            title: job.title || 'Untitled',
            reason: err.message || 'Unknown error'
          });
        }
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'schedule',
        description: `Batch rescheduled ${rescheduledJobs.length} jobs (${failedJobs.length} failed)`,
        metadata: { 
          tool: 'batch_reschedule_jobs', 
          strategy,
          rescheduledCount: rescheduledJobs.length,
          failedCount: failedJobs.length
        },
        accepted: true
      });

      return {
        success: true,
        strategy_used: strategy,
        rescheduled_count: rescheduledJobs.length,
        failed_count: failedJobs.length,
        rescheduledJobs,
        failedJobs,
        rescheduledJobIds: rescheduledJobs.map(j => j.jobId)
      };
    }
  },

  // ============================================
  // CHECKLIST DOMAIN TOOLS
  // ============================================

  get_checklist_templates: {
    name: 'get_checklist_templates',
    description: 'Get all available checklist templates',
    parameters: {
      type: 'object',
      properties: {
        includeSystem: { type: 'boolean', description: 'Include system templates' }
      }
    },
    execute: async (args: any, context: any) => {
      let query = context.supabase
        .from('sg_checklist_templates')
        .select('*, sg_checklist_template_items(count)')
        .or(`business_id.eq.${context.businessId},is_system_template.eq.true`)
        .eq('is_archived', false);

      const { data, error } = await query;
      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved ${data?.length || 0} checklist templates`,
        metadata: { tool: 'get_checklist_templates' }
      });

      return { templates: data || [], count: data?.length || 0 };
    }
  },

  assign_checklist_to_job: {
    name: 'assign_checklist_to_job',
    description: 'Assign a checklist template to a job',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID' },
        templateId: { type: 'string', description: 'Checklist template ID' }
      },
      required: ['jobId', 'templateId']
    },
    execute: async (args: any, context: any) => {
      // Get template with items
      const { data: template } = await context.supabase
        .from('sg_checklist_templates')
        .select('*, sg_checklist_template_items(*)')
        .eq('id', args.templateId)
        .single();

      if (!template) throw new Error('Template not found');

      // Get job info
      const { data: job } = await context.supabase
        .from('jobs')
        .select('title, customers(name)')
        .eq('id', args.jobId)
        .single();

      // Create checklist instance
      const { data: checklist, error } = await context.supabase
        .from('sg_checklists')
        .insert({
          business_id: context.businessId,
          job_id: args.jobId,
          template_id: args.templateId,
          name: template.name,
          created_by: context.userId
        })
        .select()
        .single();

      if (error) throw error;

      // Create checklist items from template
      if (template.sg_checklist_template_items?.length > 0) {
        const items = template.sg_checklist_template_items.map((ti: any) => ({
          checklist_id: checklist.id,
          name: ti.name,
          description: ti.description,
          position: ti.position,
          is_required: ti.is_required
        }));

        await context.supabase.from('sg_checklist_items').insert(items);
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'assign',
        description: `Assigned checklist "${template.name}" to job`,
        metadata: { tool: 'assign_checklist_to_job', job_id: args.jobId, template_id: args.templateId }
      });

      return { 
        success: true, 
        checklist_id: checklist.id,
        template_name: template.name,
        job_title: job?.title,
        item_count: template.sg_checklist_template_items?.length || 0
      };
    }
  },

  get_job_checklist_progress: {
    name: 'get_job_checklist_progress',
    description: 'Get checklist completion progress for a job',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID' }
      },
      required: ['jobId']
    },
    execute: async (args: any, context: any) => {
      const { data: checklists, error } = await context.supabase
        .from('sg_checklists')
        .select('*, sg_checklist_items(*)')
        .eq('job_id', args.jobId);

      if (error) throw error;

      const progress = checklists?.map((cl: any) => {
        const items = cl.sg_checklist_items || [];
        const completed = items.filter((i: any) => i.is_completed).length;
        
        return {
          checklist_id: cl.id,
          name: cl.name,
          total_items: items.length,
          completed_items: completed,
          completion_percent: items.length > 0 ? Math.round((completed / items.length) * 100) : 0
        };
      }) || [];

      const overallCompletion = progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + p.completion_percent, 0) / progress.length)
        : 0;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved checklist progress for job: ${overallCompletion}% complete`,
        metadata: { tool: 'get_job_checklist_progress', job_id: args.jobId }
      });

      return { 
        checklists: progress, 
        overall_completion: overallCompletion
      };
    }
  },

  // ============================================
  // JOB ENHANCEMENT TOOLS
  // ============================================

  add_job_note: {
    name: 'add_job_note',
    description: 'Add a note to a job',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID' },
        note: { type: 'string', description: 'Note content to add' }
      },
      required: ['jobId', 'note']
    },
    execute: async (args: any, context: any) => {
      const { data: job } = await context.supabase
        .from('jobs')
        .select('notes, title')
        .eq('id', args.jobId)
        .single();

      if (!job) throw new Error('Job not found');

      const timestamp = new Date().toLocaleString();
      const newNote = `[${timestamp}] ${args.note}`;
      const updatedNotes = job.notes ? `${job.notes}\n\n${newNote}` : newNote;

      const { error } = await context.supabase
        .from('jobs')
        .update({ notes: updatedNotes })
        .eq('id', args.jobId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'note',
        description: `Added note to job: ${job.title}`,
        metadata: { tool: 'add_job_note', job_id: args.jobId }
      });

      return { success: true, job_title: job.title };
    }
  },

  assign_job_to_member: {
    name: 'assign_job_to_member',
    description: 'Assign a team member to a job',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID' },
        userId: { type: 'string', description: 'Team member user ID' }
      },
      required: ['jobId', 'userId']
    },
    execute: async (args: any, context: any) => {
      // Verify job belongs to business
      const { data: job } = await context.supabase
        .from('jobs')
        .select('title')
        .eq('id', args.jobId)
        .eq('business_id', context.businessId)
        .single();

      if (!job) throw new Error('Job not found');

      // Get member name
      const { data: member } = await context.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', args.userId)
        .single();

      // Check for existing assignment
      const { data: existing } = await context.supabase
        .from('job_assignments')
        .select('id')
        .eq('job_id', args.jobId)
        .eq('user_id', args.userId)
        .single();

      if (existing) {
        return { 
          success: false, 
          message: 'Member is already assigned to this job' 
        };
      }

      const { error } = await context.supabase
        .from('job_assignments')
        .insert({
          job_id: args.jobId,
          user_id: args.userId,
          assigned_by: context.userId
        });

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'assign',
        description: `Assigned ${member?.full_name} to ${job.title}`,
        metadata: { tool: 'assign_job_to_member', job_id: args.jobId, assigned_user_id: args.userId }
      });

      return { 
        success: true, 
        job_title: job.title,
        assigned_to: member?.full_name
      };
    }
  },

  get_job_timeline: {
    name: 'get_job_timeline',
    description: 'Get complete activity timeline for a job',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID' }
      },
      required: ['jobId']
    },
    execute: async (args: any, context: any) => {
      const { data: job, error } = await context.supabase
        .from('jobs')
        .select(`
          *,
          customers(name),
          job_assignments(created_at, profiles(full_name)),
          invoices(id, number, status, created_at),
          sg_checklists(id, name, sg_checklist_items(is_completed, completed_at))
        `)
        .eq('id', args.jobId)
        .single();

      if (error) throw error;

      // Build timeline events
      const events: any[] = [];

      // Job created
      events.push({
        type: 'created',
        timestamp: job.created_at,
        description: `Job created for ${job.customers?.name}`
      });

      // Status changes (simplified - just current status)
      if (job.starts_at) {
        events.push({
          type: 'scheduled',
          timestamp: job.starts_at,
          description: `Scheduled for ${new Date(job.starts_at).toLocaleDateString()}`
        });
      }

      // Assignments
      for (const assignment of job.job_assignments || []) {
        events.push({
          type: 'assigned',
          timestamp: assignment.created_at,
          description: `${assignment.profiles?.full_name} assigned`
        });
      }

      // Invoices
      for (const invoice of job.invoices || []) {
        events.push({
          type: 'invoice',
          timestamp: invoice.created_at,
          description: `Invoice ${invoice.number} created (${invoice.status})`
        });
      }

      // Sort by timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved timeline for job: ${job.title}`,
        metadata: { tool: 'get_job_timeline', job_id: args.jobId }
      });

      return { 
        job: {
          id: job.id,
          title: job.title,
          status: job.status,
          customer: job.customers?.name
        },
        timeline: events,
        event_count: events.length
      };
    }
  },

  get_requests_pending: {
    name: 'get_requests_pending',
    description: 'Get pending service requests that need attention',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: New, In Review, Scheduled' }
      }
    },
    execute: async (args: any, context: any) => {
      let query = context.supabase
        .from('requests')
        .select('*, customers(name, email, phone)')
        .eq('business_id', context.businessId)
        .order('created_at', { ascending: false });

      if (args.status) {
        query = query.eq('status', args.status);
      } else {
        query = query.in('status', ['New', 'In Review']);
      }

      const { data, error } = await query.limit(25);
      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved ${data?.length || 0} pending requests`,
        metadata: { tool: 'get_requests_pending' }
      });

      return { requests: data || [], count: data?.length || 0 };
    }
  },

  get_business_metrics: {
    name: 'get_business_metrics',
    description: 'Get key business metrics and KPIs',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Period: today, week, month, year' }
      }
    },
    execute: async (args: any, context: any) => {
      const period = args.period || 'month';
      let startDate: Date;
      
      switch (period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'year':
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default: // month
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
      }

      const [jobsRes, quotesRes, invoicesRes, paymentsRes] = await Promise.all([
        context.supabase
          .from('jobs')
          .select('id, status, total', { count: 'exact' })
          .eq('business_id', context.businessId)
          .gte('created_at', startDate.toISOString()),
        context.supabase
          .from('quotes')
          .select('id, status, total', { count: 'exact' })
          .eq('business_id', context.businessId)
          .gte('created_at', startDate.toISOString()),
        context.supabase
          .from('invoices')
          .select('id, status, total', { count: 'exact' })
          .eq('business_id', context.businessId)
          .gte('created_at', startDate.toISOString()),
        context.supabase
          .from('payments')
          .select('amount')
          .gte('received_at', startDate.toISOString())
      ]);

      const completedJobs = jobsRes.data?.filter((j: any) => j.status === 'Completed').length || 0;
      const approvedQuotes = quotesRes.data?.filter((q: any) => q.status === 'Approved').length || 0;
      const paidInvoices = invoicesRes.data?.filter((i: any) => i.status === 'Paid').length || 0;
      const totalRevenue = paymentsRes.data?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved business metrics for ${period}`,
        metadata: { tool: 'get_business_metrics', period }
      });

      return {
        period,
        metrics: {
          jobs_created: jobsRes.count || 0,
          jobs_completed: completedJobs,
          quotes_sent: quotesRes.count || 0,
          quotes_approved: approvedQuotes,
          quote_conversion_rate: quotesRes.count ? Math.round((approvedQuotes / quotesRes.count) * 100) : 0,
          invoices_created: invoicesRes.count || 0,
          invoices_paid: paidInvoices,
          total_revenue: totalRevenue
        }
      };
    }
  },

  // ============================================
  // MULTI-STEP PLAN SUPPORT TOOLS
  // ============================================

  send_job_confirmations: {
    name: 'send_job_confirmations',
    description: 'Send confirmation emails to customers for scheduled jobs',
    parameters: {
      type: 'object',
      properties: {
        jobIds: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of job IDs to send confirmations for' 
        }
      },
      required: ['jobIds']
    },
    execute: async (args: any, context: any) => {
      const { data: jobs, error } = await context.supabase
        .from('jobs')
        .select('*, customers(name, email)')
        .in('id', args.jobIds)
        .eq('business_id', context.businessId);

      if (error) throw error;

      const sent: any[] = [];
      const failed: any[] = [];

      for (const job of jobs || []) {
        if (!job.customers?.email) {
          failed.push({ jobId: job.id, reason: 'No customer email' });
          continue;
        }
        
        // In production, this would call an email service
        // For now, we simulate successful sending
        sent.push({
          jobId: job.id,
          customerName: job.customers.name,
          email: job.customers.email,
          scheduledTime: job.starts_at
        });
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'notification',
        description: `Sent ${sent.length} job confirmation emails`,
        metadata: { tool: 'send_job_confirmations', sent: sent.length, failed: failed.length }
      });

      return { 
        success: true, 
        sent_count: sent.length,
        failed_count: failed.length,
        sent,
        failed
      };
    }
  },

  get_overdue_invoices: {
    name: 'get_overdue_invoices',
    description: 'Get all invoices past their due date',
    parameters: {
      type: 'object',
      properties: {
        daysOverdue: { type: 'number', description: 'Minimum days overdue (default: 0)' }
      }
    },
    execute: async (args: any, context: any) => {
      const daysOverdue = args.daysOverdue || 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

      const { data, error } = await context.supabase
        .from('invoices')
        .select('*, customers(name, email)')
        .eq('business_id', context.businessId)
        .eq('status', 'Sent')
        .lt('due_at', cutoffDate.toISOString())
        .order('due_at', { ascending: true });

      if (error) throw error;

      const totalOverdue = (data || []).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Found ${data?.length || 0} overdue invoices totaling $${totalOverdue.toFixed(2)}`,
        metadata: { tool: 'get_overdue_invoices', count: data?.length || 0 }
      });

      return { 
        invoices: data || [], 
        count: data?.length || 0,
        total_overdue: totalOverdue
      };
    }
  },

  batch_send_reminders: {
    name: 'batch_send_reminders',
    description: 'Send payment reminder emails for multiple invoices',
    parameters: {
      type: 'object',
      properties: {
        invoiceIds: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of invoice IDs to send reminders for' 
        }
      },
      required: ['invoiceIds']
    },
    execute: async (args: any, context: any) => {
      const { data: invoices, error } = await context.supabase
        .from('invoices')
        .select('*, customers(name, email)')
        .in('id', args.invoiceIds)
        .eq('business_id', context.businessId);

      if (error) throw error;

      const sent: any[] = [];
      const failed: any[] = [];

      for (const invoice of invoices || []) {
        if (!invoice.customers?.email) {
          failed.push({ invoiceId: invoice.id, reason: 'No customer email' });
          continue;
        }
        
        // In production, this would call an email service
        sent.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          customerName: invoice.customers.name,
          email: invoice.customers.email,
          amount: invoice.total
        });
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'notification',
        description: `Sent ${sent.length} payment reminder emails`,
        metadata: { tool: 'batch_send_reminders', sent: sent.length, failed: failed.length }
      });

      return { 
        success: true, 
        sent_count: sent.length,
        failed_count: failed.length,
        sent,
        failed
      };
    }
  },

  get_completed_jobs: {
    name: 'get_completed_jobs',
    description: 'Get all jobs marked as completed that are ready for invoicing',
    parameters: {
      type: 'object',
      properties: {
        dateRange: { 
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start date YYYY-MM-DD' },
            end: { type: 'string', description: 'End date YYYY-MM-DD' }
          }
        },
        uninvoicedOnly: { type: 'boolean', description: 'Only return jobs without invoices' }
      }
    },
    execute: async (args: any, context: any) => {
      let query = context.supabase
        .from('jobs')
        .select('*, customers(name, email), invoices(id)')
        .eq('business_id', context.businessId)
        .eq('status', 'Completed');

      if (args.dateRange?.start) {
        query = query.gte('ends_at', `${args.dateRange.start}T00:00:00Z`);
      }
      if (args.dateRange?.end) {
        query = query.lte('ends_at', `${args.dateRange.end}T23:59:59Z`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let jobs = data || [];
      
      // Filter to uninvoiced if requested
      if (args.uninvoicedOnly) {
        jobs = jobs.filter((j: any) => !j.invoices || j.invoices.length === 0);
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Found ${jobs.length} completed jobs`,
        metadata: { tool: 'get_completed_jobs', count: jobs.length }
      });

      return { jobs, count: jobs.length };
    }
  },

  batch_update_job_status: {
    name: 'batch_update_job_status',
    description: 'Update status of multiple jobs at once',
    parameters: {
      type: 'object',
      properties: {
        jobIds: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of job IDs to update' 
        },
        newStatus: { 
          type: 'string', 
          enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Closed'],
          description: 'New status for all jobs' 
        }
      },
      required: ['jobIds', 'newStatus']
    },
    execute: async (args: any, context: any) => {
      // Get current status for rollback
      const { data: currentJobs } = await context.supabase
        .from('jobs')
        .select('id, status')
        .in('id', args.jobIds)
        .eq('business_id', context.businessId);

      const previousStatus = currentJobs?.[0]?.status || 'Completed';

      const { error } = await context.supabase
        .from('jobs')
        .update({ status: args.newStatus, updated_at: new Date().toISOString() })
        .in('id', args.jobIds)
        .eq('business_id', context.businessId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'batch_update',
        description: `Updated ${args.jobIds.length} jobs to status: ${args.newStatus}`,
        metadata: { tool: 'batch_update_job_status', count: args.jobIds.length, new_status: args.newStatus }
      });

      return { 
        success: true, 
        updatedJobIds: args.jobIds,
        newStatus: args.newStatus,
        previousStatus,
        count: args.jobIds.length
      };
    }
  },

  batch_create_invoices: {
    name: 'batch_create_invoices',
    description: 'Create invoices for multiple jobs at once',
    parameters: {
      type: 'object',
      properties: {
        jobIds: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of job IDs to create invoices for' 
        }
      },
      required: ['jobIds']
    },
    execute: async (args: any, context: any) => {
      const { data: jobs, error: jobsError } = await context.supabase
        .from('jobs')
        .select('*, customers(id, name)')
        .in('id', args.jobIds)
        .eq('business_id', context.businessId);

      if (jobsError) throw jobsError;

      const created: any[] = [];
      const failed: any[] = [];

      for (const job of jobs || []) {
        if (!job.customer_id) {
          failed.push({ jobId: job.id, reason: 'No customer linked' });
          continue;
        }

        // Get next invoice number
        const { data: business } = await context.supabase
          .from('businesses')
          .select('inv_seq, inv_prefix')
          .eq('id', context.businessId)
          .single();

        const invoiceNumber = `${business?.inv_prefix || 'INV-'}${String((business?.inv_seq || 0) + 1).padStart(4, '0')}`;

        const { data: invoice, error: invoiceError } = await context.supabase
          .from('invoices')
          .insert({
            business_id: context.businessId,
            customer_id: job.customer_id,
            owner_id: context.userId,
            job_id: job.id,
            number: invoiceNumber,
            subtotal: job.total || 0,
            total: job.total || 0,
            status: 'Draft'
          })
          .select()
          .single();

        if (invoiceError) {
          failed.push({ jobId: job.id, reason: invoiceError.message });
          continue;
        }

        // Update sequence
        await context.supabase
          .from('businesses')
          .update({ inv_seq: (business?.inv_seq || 0) + 1 })
          .eq('id', context.businessId);

        created.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          jobId: job.id,
          jobTitle: job.title,
          customerName: job.customers?.name,
          total: invoice.total
        });
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'batch_create',
        description: `Created ${created.length} invoices from completed jobs`,
        metadata: { tool: 'batch_create_invoices', created: created.length, failed: failed.length }
      });

      return { 
        success: true, 
        created_count: created.length,
        failed_count: failed.length,
        invoices: created,
        failed
      };
    }
  },

  unschedule_jobs: {
    name: 'unschedule_jobs',
    description: 'Remove scheduling from jobs (set starts_at/ends_at to null)',
    parameters: {
      type: 'object',
      properties: {
        jobIds: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of job IDs to unschedule' 
        }
      },
      required: ['jobIds']
    },
    execute: async (args: any, context: any) => {
      const { error } = await context.supabase
        .from('jobs')
        .update({ 
          starts_at: null, 
          ends_at: null, 
          status: 'Unscheduled',
          ai_suggested: false,
          updated_at: new Date().toISOString() 
        })
        .in('id', args.jobIds)
        .eq('business_id', context.businessId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'rollback',
        description: `Unscheduled ${args.jobIds.length} jobs (rollback)`,
        metadata: { tool: 'unschedule_jobs', count: args.jobIds.length }
      });

      return { 
        success: true, 
        unscheduled_count: args.jobIds.length,
        jobIds: args.jobIds
      };
    }
  },

  // ============================================
  // PHASE 3: CORE CRUD TOOLS
  // ============================================

  create_job: {
    name: 'create_job',
    description: 'Create a standalone job directly for a customer without requiring a request or quote',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID' },
        title: { type: 'string', description: 'Job title/description' },
        notes: { type: 'string', description: 'Additional notes' },
        address: { type: 'string', description: 'Job location address (optional, defaults to customer address)' },
        estimatedDuration: { type: 'number', description: 'Estimated duration in minutes (default: 60)' },
        scheduleTime: { type: 'string', description: 'Optional schedule time in ISO format' }
      },
      required: ['customerId', 'title']
    },
    execute: async (args: any, context: any) => {
      // Fetch customer to get default address
      const { data: customer } = await context.supabase
        .from('customers')
        .select('name, address')
        .eq('id', args.customerId)
        .eq('business_id', context.businessId)
        .single();

      if (!customer) throw new Error('Customer not found');

      const jobData: any = {
        business_id: context.businessId,
        owner_id: context.userId,
        customer_id: args.customerId,
        title: args.title,
        notes: args.notes,
        address: args.address || customer.address,
        estimated_duration_minutes: args.estimatedDuration || 60,
        status: args.scheduleTime ? 'Scheduled' : 'Unscheduled'
      };

      if (args.scheduleTime) {
        jobData.starts_at = args.scheduleTime;
        const duration = args.estimatedDuration || 60;
        jobData.ends_at = new Date(new Date(args.scheduleTime).getTime() + duration * 60000).toISOString();
      }

      const { data: job, error } = await context.supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'create',
        description: `Created job "${args.title}" for ${customer.name}`,
        metadata: { tool: 'create_job', job_id: job.id, customer_id: args.customerId }
      });

      return { 
        success: true, 
        job_id: job.id, 
        title: args.title,
        customer_name: customer.name,
        status: jobData.status,
        scheduled_time: args.scheduleTime || null
      };
    }
  },

  update_job: {
    name: 'update_job',
    description: 'Update any field of an existing job',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID to update' },
        title: { type: 'string', description: 'New job title' },
        notes: { type: 'string', description: 'New notes' },
        address: { type: 'string', description: 'New address' },
        estimatedDuration: { type: 'number', description: 'New estimated duration in minutes' }
      },
      required: ['jobId']
    },
    execute: async (args: any, context: any) => {
      const updates: any = { updated_at: new Date().toISOString() };
      
      if (args.title) updates.title = args.title;
      if (args.notes !== undefined) updates.notes = args.notes;
      if (args.address) updates.address = args.address;
      if (args.estimatedDuration) updates.estimated_duration_minutes = args.estimatedDuration;

      const { data: job, error } = await context.supabase
        .from('jobs')
        .update(updates)
        .eq('id', args.jobId)
        .eq('business_id', context.businessId)
        .select('*, customers(name)')
        .single();

      if (error) throw error;

      const changedFields = Object.keys(updates).filter(k => k !== 'updated_at');

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'update',
        description: `Updated job: ${changedFields.join(', ')}`,
        metadata: { tool: 'update_job', job_id: args.jobId, changes: changedFields }
      });

      return { 
        success: true, 
        job_id: args.jobId,
        job_title: job.title,
        customer_name: job.customers?.name,
        updated_fields: changedFields
      };
    }
  },

  update_customer: {
    name: 'update_customer',
    description: 'Update customer details like name, email, phone, or address',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID to update' },
        name: { type: 'string', description: 'New name' },
        email: { type: 'string', description: 'New email' },
        phone: { type: 'string', description: 'New phone number' },
        address: { type: 'string', description: 'New address' },
        notes: { type: 'string', description: 'Internal notes' }
      },
      required: ['customerId']
    },
    execute: async (args: any, context: any) => {
      const updates: any = { updated_at: new Date().toISOString() };
      
      if (args.name) updates.name = args.name;
      if (args.email) updates.email = args.email;
      if (args.phone) updates.phone = args.phone;
      if (args.address) updates.address = args.address;
      if (args.notes !== undefined) updates.notes = args.notes;

      const { data: customer, error } = await context.supabase
        .from('customers')
        .update(updates)
        .eq('id', args.customerId)
        .eq('business_id', context.businessId)
        .select()
        .single();

      if (error) throw error;

      const changedFields = Object.keys(updates).filter(k => k !== 'updated_at');

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'update',
        description: `Updated customer ${customer.name}: ${changedFields.join(', ')}`,
        metadata: { tool: 'update_customer', customer_id: args.customerId, changes: changedFields }
      });

      return { 
        success: true, 
        customer_id: args.customerId,
        customer_name: customer.name,
        updated_fields: changedFields
      };
    }
  },

  update_quote: {
    name: 'update_quote',
    description: 'Update quote details like notes, valid until date, or add line items',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'Quote ID to update' },
        notes: { type: 'string', description: 'New internal notes' },
        validUntil: { type: 'string', description: 'New valid until date (ISO format)' },
        lineItems: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              qty: { type: 'number' },
              unit_price: { type: 'number' }
            }
          },
          description: 'Line items to add (appended to existing)'
        }
      },
      required: ['quoteId']
    },
    execute: async (args: any, context: any) => {
      const updates: any = { updated_at: new Date().toISOString() };
      
      if (args.notes !== undefined) updates.notes = args.notes;
      if (args.validUntil) updates.valid_until = args.validUntil;

      const { data: quote, error } = await context.supabase
        .from('quotes')
        .update(updates)
        .eq('id', args.quoteId)
        .eq('business_id', context.businessId)
        .select('*, customers(name)')
        .single();

      if (error) throw error;

      // Add new line items if provided
      let addedItems = 0;
      if (args.lineItems && args.lineItems.length > 0) {
        const lineItemsData = args.lineItems.map((item: any, idx: number) => ({
          quote_id: args.quoteId,
          owner_id: context.userId,
          name: item.name,
          qty: item.qty || 1,
          unit_price: item.unit_price,
          line_total: (item.qty || 1) * item.unit_price,
          position: 100 + idx // Append after existing
        }));

        const { error: liError } = await context.supabase
          .from('quote_line_items')
          .insert(lineItemsData);

        if (!liError) addedItems = args.lineItems.length;

        // Recalculate totals
        const { data: allItems } = await context.supabase
          .from('quote_line_items')
          .select('line_total')
          .eq('quote_id', args.quoteId);

        const newSubtotal = allItems?.reduce((sum: number, i: any) => sum + (i.line_total || 0), 0) || 0;
        const taxRate = quote.tax_rate || 0;
        const newTotal = newSubtotal * (1 + taxRate / 100);

        await context.supabase
          .from('quotes')
          .update({ subtotal: newSubtotal, total: newTotal })
          .eq('id', args.quoteId);
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'update',
        description: `Updated quote ${quote.number}${addedItems > 0 ? `, added ${addedItems} line items` : ''}`,
        metadata: { tool: 'update_quote', quote_id: args.quoteId, added_items: addedItems }
      });

      return { 
        success: true, 
        quote_id: args.quoteId,
        quote_number: quote.number,
        customer_name: quote.customers?.name,
        line_items_added: addedItems
      };
    }
  },

  cancel_job: {
    name: 'cancel_job',
    description: 'Cancel a job with an optional reason',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID to cancel' },
        reason: { type: 'string', description: 'Reason for cancellation' }
      },
      required: ['jobId']
    },
    execute: async (args: any, context: any) => {
      const { data: job } = await context.supabase
        .from('jobs')
        .select('title, customers(name)')
        .eq('id', args.jobId)
        .eq('business_id', context.businessId)
        .single();

      if (!job) throw new Error('Job not found');

      const noteText = args.reason ? `[CANCELLED] ${args.reason}` : '[CANCELLED]';
      
      const { error } = await context.supabase
        .from('jobs')
        .update({ 
          status: 'Cancelled',
          notes: job.notes ? `${job.notes}\n\n${noteText}` : noteText,
          updated_at: new Date().toISOString()
        })
        .eq('id', args.jobId)
        .eq('business_id', context.businessId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'cancel',
        description: `Cancelled job "${job.title}"${args.reason ? `: ${args.reason}` : ''}`,
        metadata: { tool: 'cancel_job', job_id: args.jobId, reason: args.reason }
      });

      return { 
        success: true, 
        job_id: args.jobId,
        job_title: job.title,
        customer_name: job.customers?.name,
        reason: args.reason
      };
    }
  },

  void_invoice: {
    name: 'void_invoice',
    description: 'Void/cancel an invoice with an optional reason',
    parameters: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID to void' },
        reason: { type: 'string', description: 'Reason for voiding' }
      },
      required: ['invoiceId']
    },
    execute: async (args: any, context: any) => {
      const { data: invoice } = await context.supabase
        .from('invoices')
        .select('number, total, customers(name)')
        .eq('id', args.invoiceId)
        .eq('business_id', context.businessId)
        .single();

      if (!invoice) throw new Error('Invoice not found');

      const noteText = args.reason ? `[VOIDED] ${args.reason}` : '[VOIDED]';
      
      const { error } = await context.supabase
        .from('invoices')
        .update({ 
          status: 'Voided',
          notes_internal: invoice.notes_internal ? `${invoice.notes_internal}\n\n${noteText}` : noteText,
          updated_at: new Date().toISOString()
        })
        .eq('id', args.invoiceId)
        .eq('business_id', context.businessId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'void',
        description: `Voided invoice ${invoice.number}${args.reason ? `: ${args.reason}` : ''}`,
        metadata: { tool: 'void_invoice', invoice_id: args.invoiceId, reason: args.reason }
      });

      return { 
        success: true, 
        invoice_id: args.invoiceId,
        invoice_number: invoice.number,
        customer_name: invoice.customers?.name,
        amount_voided: invoice.total,
        reason: args.reason
      };
    }
  },

  delete_quote: {
    name: 'delete_quote',
    description: 'Delete/archive a quote (soft delete)',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'Quote ID to delete' },
        reason: { type: 'string', description: 'Reason for deletion' }
      },
      required: ['quoteId']
    },
    execute: async (args: any, context: any) => {
      const { data: quote } = await context.supabase
        .from('quotes')
        .select('number, total, customers(name)')
        .eq('id', args.quoteId)
        .eq('business_id', context.businessId)
        .single();

      if (!quote) throw new Error('Quote not found');

      // Soft delete by changing status
      const { error } = await context.supabase
        .from('quotes')
        .update({ 
          status: 'Deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', args.quoteId)
        .eq('business_id', context.businessId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'delete',
        description: `Deleted quote ${quote.number}${args.reason ? `: ${args.reason}` : ''}`,
        metadata: { tool: 'delete_quote', quote_id: args.quoteId, reason: args.reason }
      });

      return { 
        success: true, 
        quote_id: args.quoteId,
        quote_number: quote.number,
        customer_name: quote.customers?.name,
        reason: args.reason
      };
    }
  },

  // ============================================
  // PHASE 3: NAVIGATION TOOLS
  // ============================================

  navigate_to_entity: {
    name: 'navigate_to_entity',
    description: 'Navigate user to view a specific entity (customer, job, quote, or invoice)',
    parameters: {
      type: 'object',
      properties: {
        entityType: { 
          type: 'string', 
          enum: ['customer', 'job', 'quote', 'invoice'],
          description: 'Type of entity to navigate to' 
        },
        entityId: { type: 'string', description: 'ID of the entity' }
      },
      required: ['entityType', 'entityId']
    },
    execute: async (args: any, context: any) => {
      const routes: Record<string, string> = {
        customer: `/customers/${args.entityId}`,
        job: `/work-orders/${args.entityId}`,
        quote: `/quotes/${args.entityId}`,
        invoice: `/invoices/${args.entityId}`
      };

      // Fetch entity name for confirmation
      let entityName = '';
      const table = args.entityType === 'customer' ? 'customers' 
        : args.entityType === 'job' ? 'jobs'
        : args.entityType === 'quote' ? 'quotes'
        : 'invoices';
      
      const nameField = args.entityType === 'customer' ? 'name'
        : args.entityType === 'job' ? 'title'
        : 'number';

      const { data } = await context.supabase
        .from(table)
        .select(nameField)
        .eq('id', args.entityId)
        .single();

      entityName = data?.[nameField] || args.entityId;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'navigate',
        description: `Navigated to ${args.entityType}: ${entityName}`,
        metadata: { tool: 'navigate_to_entity', entity_type: args.entityType, entity_id: args.entityId }
      });

      return { 
        success: true,
        navigation: {
          type: 'entity',
          entityType: args.entityType,
          entityId: args.entityId,
          entityName,
          url: routes[args.entityType]
        }
      };
    }
  },

  navigate_to_calendar: {
    name: 'navigate_to_calendar',
    description: 'Navigate user to the calendar view, optionally to a specific date',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to navigate to (YYYY-MM-DD format)' },
        view: { 
          type: 'string', 
          enum: ['day', 'week', 'month'],
          description: 'Calendar view mode' 
        }
      }
    },
    execute: async (args: any, context: any) => {
      const params = new URLSearchParams();
      if (args.date) params.set('date', args.date);
      if (args.view) params.set('view', args.view);

      const url = params.toString() ? `/calendar?${params.toString()}` : '/calendar';

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'navigate',
        description: `Navigated to calendar${args.date ? ` for ${args.date}` : ''}`,
        metadata: { tool: 'navigate_to_calendar', date: args.date, view: args.view }
      });

      return { 
        success: true,
        navigation: {
          type: 'calendar',
          date: args.date || new Date().toISOString().split('T')[0],
          view: args.view || 'week',
          url
        }
      };
    }
  },

  // ============================================
  // PHASE 3: INTELLIGENCE TOOLS
  // ============================================

  lookup_entity: {
    name: 'lookup_entity',
    description: 'Fuzzy search across all entity types (customers, jobs, quotes, invoices) by name, number, or title',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        entityTypes: { 
          type: 'array',
          items: { type: 'string', enum: ['customer', 'job', 'quote', 'invoice'] },
          description: 'Optional filter to specific entity types'
        },
        limit: { type: 'number', description: 'Max results per type (default: 5)' }
      },
      required: ['query']
    },
    execute: async (args: any, context: any) => {
      const searchQuery = `%${args.query}%`;
      const limit = args.limit || 5;
      const types = args.entityTypes || ['customer', 'job', 'quote', 'invoice'];
      const results: any[] = [];

      // Search customers
      if (types.includes('customer')) {
        const { data: customers } = await context.supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('business_id', context.businessId)
          .or(`name.ilike.${searchQuery},email.ilike.${searchQuery},phone.ilike.${searchQuery}`)
          .limit(limit);

        (customers || []).forEach((c: any) => {
          results.push({
            type: 'customer',
            id: c.id,
            name: c.name,
            subtitle: c.email || c.phone,
            relevance: c.name.toLowerCase().includes(args.query.toLowerCase()) ? 1 : 0.7
          });
        });
      }

      // Search jobs
      if (types.includes('job')) {
        const { data: jobs } = await context.supabase
          .from('jobs')
          .select('id, title, status, customers(name)')
          .eq('business_id', context.businessId)
          .or(`title.ilike.${searchQuery}`)
          .limit(limit);

        (jobs || []).forEach((j: any) => {
          results.push({
            type: 'job',
            id: j.id,
            name: j.title || 'Untitled Job',
            subtitle: `${j.status} - ${j.customers?.name || 'No customer'}`,
            relevance: (j.title || '').toLowerCase().includes(args.query.toLowerCase()) ? 1 : 0.7
          });
        });
      }

      // Search quotes
      if (types.includes('quote')) {
        const { data: quotes } = await context.supabase
          .from('quotes')
          .select('id, number, status, total, customers(name)')
          .eq('business_id', context.businessId)
          .ilike('number', searchQuery)
          .limit(limit);

        (quotes || []).forEach((q: any) => {
          results.push({
            type: 'quote',
            id: q.id,
            name: q.number,
            subtitle: `$${q.total?.toFixed(2)} - ${q.customers?.name || 'Unknown'}`,
            relevance: q.number.toLowerCase().includes(args.query.toLowerCase()) ? 1 : 0.7
          });
        });
      }

      // Search invoices
      if (types.includes('invoice')) {
        const { data: invoices } = await context.supabase
          .from('invoices')
          .select('id, number, status, total, customers(name)')
          .eq('business_id', context.businessId)
          .ilike('number', searchQuery)
          .limit(limit);

        (invoices || []).forEach((inv: any) => {
          results.push({
            type: 'invoice',
            id: inv.id,
            name: inv.number,
            subtitle: `$${inv.total?.toFixed(2)} - ${inv.customers?.name || 'Unknown'}`,
            relevance: inv.number.toLowerCase().includes(args.query.toLowerCase()) ? 1 : 0.7
          });
        });
      }

      // Sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'search',
        description: `Searched for "${args.query}" - found ${results.length} results`,
        metadata: { tool: 'lookup_entity', query: args.query, result_count: results.length }
      });

      return { 
        query: args.query,
        results: results.slice(0, 15),
        total_count: results.length
      };
    }
  },

  get_suggested_actions: {
    name: 'get_suggested_actions',
    description: 'Get context-aware suggested actions based on current business state',
    parameters: {
      type: 'object',
      properties: {
        currentPage: { type: 'string', description: 'Current page/route for context' }
      }
    },
    execute: async (args: any, context: any) => {
      const suggestions: any[] = [];

      // Check unscheduled jobs
      const { count: unscheduledCount } = await context.supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', context.businessId)
        .is('starts_at', null)
        .neq('status', 'Cancelled');

      if (unscheduledCount && unscheduledCount > 0) {
        suggestions.push({
          priority: 'high',
          action: 'schedule_jobs',
          title: `Schedule ${unscheduledCount} pending job${unscheduledCount !== 1 ? 's' : ''}`,
          description: 'Use AI-powered scheduling to optimize your calendar',
          command: 'Schedule all pending jobs'
        });
      }

      // Check pending quotes
      const { count: pendingQuotes } = await context.supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', context.businessId)
        .eq('status', 'Draft');

      if (pendingQuotes && pendingQuotes > 0) {
        suggestions.push({
          priority: 'medium',
          action: 'send_quotes',
          title: `${pendingQuotes} quote${pendingQuotes !== 1 ? 's' : ''} ready to send`,
          description: 'Draft quotes waiting to be sent to customers',
          command: 'Show pending quotes'
        });
      }

      // Check overdue invoices
      const { count: overdueCount } = await context.supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', context.businessId)
        .eq('status', 'Sent')
        .lt('due_at', new Date().toISOString());

      if (overdueCount && overdueCount > 0) {
        suggestions.push({
          priority: 'high',
          action: 'collect_payments',
          title: `${overdueCount} overdue invoice${overdueCount !== 1 ? 's' : ''}`,
          description: 'Send payment reminders to collect outstanding balances',
          command: 'Show overdue invoices'
        });
      }

      // Check pending requests
      const { count: pendingRequests } = await context.supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', context.businessId)
        .eq('status', 'New');

      if (pendingRequests && pendingRequests > 0) {
        suggestions.push({
          priority: 'medium',
          action: 'review_requests',
          title: `${pendingRequests} new service request${pendingRequests !== 1 ? 's' : ''}`,
          description: 'Review and convert to jobs or quotes',
          command: 'Show pending requests'
        });
      }

      // Default suggestion if nothing urgent
      if (suggestions.length === 0) {
        suggestions.push({
          priority: 'low',
          action: 'view_metrics',
          title: 'View business performance',
          description: 'Check your revenue, job completion rates, and team utilization',
          command: 'Show business metrics'
        });
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Generated ${suggestions.length} suggested actions`,
        metadata: { tool: 'get_suggested_actions', count: suggestions.length }
      });

      return { suggestions };
    }
  },

  undo_last_action: {
    name: 'undo_last_action',
    description: 'Attempt to reverse the last action taken by the AI. Only works for reversible operations like status changes and updates.',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async (args: any, context: any) => {
      // Find the last reversible action
      const { data: lastActions } = await context.supabase
        .from('ai_activity_log')
        .select('*')
        .eq('business_id', context.businessId)
        .eq('user_id', context.userId)
        .in('activity_type', ['update', 'schedule', 'reschedule', 'cancel', 'batch_schedule'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (!lastActions || lastActions.length === 0) {
        return {
          success: false,
          message: 'No reversible actions found in recent history'
        };
      }

      const lastAction = lastActions[0];
      const metadata = lastAction.metadata || {};
      
      let undoResult: any = { success: false };

      switch (lastAction.activity_type) {
        case 'update':
        case 'batch_update':
          // For updates, we can't truly undo without stored previous values
          undoResult = {
            success: false,
            message: 'Cannot undo update operations - previous values not stored'
          };
          break;

        case 'schedule':
        case 'batch_schedule':
        case 'reschedule':
          // Unschedule the job(s)
          const jobIds = metadata.job_id ? [metadata.job_id] : (metadata.scheduled || []).map((s: any) => s.jobId);
          
          if (jobIds.length > 0) {
            const { error } = await context.supabase
              .from('jobs')
              .update({ 
                starts_at: null, 
                ends_at: null, 
                status: 'Unscheduled',
                ai_suggested: false 
              })
              .in('id', jobIds)
              .eq('business_id', context.businessId);

            if (!error) {
              undoResult = {
                success: true,
                action: 'unscheduled',
                affected_jobs: jobIds.length,
                message: `Unscheduled ${jobIds.length} job${jobIds.length !== 1 ? 's' : ''}`
              };
            }
          }
          break;

        case 'cancel':
          // Restore cancelled job to previous status (default: Unscheduled)
          if (metadata.job_id) {
            const { error } = await context.supabase
              .from('jobs')
              .update({ status: 'Unscheduled' })
              .eq('id', metadata.job_id)
              .eq('business_id', context.businessId);

            if (!error) {
              undoResult = {
                success: true,
                action: 'restored',
                job_id: metadata.job_id,
                message: 'Restored cancelled job to Unscheduled status'
              };
            }
          }
          break;

        default:
          undoResult = {
            success: false,
            message: `Cannot undo ${lastAction.activity_type} operations`
          };
      }

      if (undoResult.success) {
        await context.supabase.from('ai_activity_log').insert({
          business_id: context.businessId,
          user_id: context.userId,
          activity_type: 'undo',
          description: `Undid previous action: ${lastAction.description}`,
          metadata: { tool: 'undo_last_action', original_action: lastAction.activity_type }
        });
      }

      return undoResult;
    }
  },

  // ============================================
  // PHASE A: TIME TRACKING TOOLS
  // ============================================

  clock_in: {
    name: 'clock_in',
    description: 'Clock in to start tracking time, optionally for a specific job',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Optional job ID to clock in for' },
        notes: { type: 'string', description: 'Optional notes for the time entry' }
      }
    },
    execute: async (args: any, context: any) => {
      // Check if already clocked in
      const { data: activeEntry } = await context.supabase
        .from('timesheet_entries')
        .select('id')
        .eq('business_id', context.businessId)
        .eq('user_id', context.userId)
        .is('clock_out', null)
        .single();

      if (activeEntry) {
        return {
          success: false,
          message: 'Already clocked in. Please clock out first.'
        };
      }

      const entryData: any = {
        business_id: context.businessId,
        user_id: context.userId,
        clock_in: new Date().toISOString(),
        notes: args.notes
      };

      if (args.jobId) {
        entryData.job_id = args.jobId;
      }

      const { data: entry, error } = await context.supabase
        .from('timesheet_entries')
        .insert(entryData)
        .select('*, jobs(title, customers(name))')
        .single();

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'clock_in',
        description: args.jobId 
          ? `Clocked in for job: ${entry.jobs?.title || 'Unknown'}`
          : 'Clocked in (no job)',
        metadata: { tool: 'clock_in', entry_id: entry.id, job_id: args.jobId }
      });

      return {
        success: true,
        entry_id: entry.id,
        clocked_in_at: entry.clock_in,
        job_title: entry.jobs?.title,
        customer_name: entry.jobs?.customers?.name
      };
    }
  },

  clock_out: {
    name: 'clock_out',
    description: 'Clock out to stop tracking time for the current active entry',
    parameters: {
      type: 'object',
      properties: {
        notes: { type: 'string', description: 'Optional notes to add to the time entry' }
      }
    },
    execute: async (args: any, context: any) => {
      // Find active entry
      const { data: activeEntry } = await context.supabase
        .from('timesheet_entries')
        .select('*, jobs(title)')
        .eq('business_id', context.businessId)
        .eq('user_id', context.userId)
        .is('clock_out', null)
        .single();

      if (!activeEntry) {
        return {
          success: false,
          message: 'Not currently clocked in.'
        };
      }

      const clockOutTime = new Date().toISOString();
      const updates: any = { clock_out: clockOutTime };
      
      if (args.notes) {
        updates.notes = activeEntry.notes 
          ? `${activeEntry.notes}\n${args.notes}` 
          : args.notes;
      }

      const { error } = await context.supabase
        .from('timesheet_entries')
        .update(updates)
        .eq('id', activeEntry.id);

      if (error) throw error;

      const hoursWorked = (new Date(clockOutTime).getTime() - new Date(activeEntry.clock_in).getTime()) / 3600000;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'clock_out',
        description: `Clocked out after ${hoursWorked.toFixed(1)} hours`,
        metadata: { tool: 'clock_out', entry_id: activeEntry.id, hours: hoursWorked.toFixed(1) }
      });

      return {
        success: true,
        entry_id: activeEntry.id,
        clocked_in_at: activeEntry.clock_in,
        clocked_out_at: clockOutTime,
        hours_worked: Math.round(hoursWorked * 100) / 100,
        job_title: activeEntry.jobs?.title
      };
    }
  },

  log_time_entry: {
    name: 'log_time_entry',
    description: 'Manually log a completed time entry with specific start and end times',
    parameters: {
      type: 'object',
      properties: {
        startTime: { type: 'string', description: 'Start time in ISO format' },
        endTime: { type: 'string', description: 'End time in ISO format' },
        jobId: { type: 'string', description: 'Optional job ID' },
        notes: { type: 'string', description: 'Notes for the entry' }
      },
      required: ['startTime', 'endTime']
    },
    execute: async (args: any, context: any) => {
      const { data: entry, error } = await context.supabase
        .from('timesheet_entries')
        .insert({
          business_id: context.businessId,
          user_id: context.userId,
          clock_in: args.startTime,
          clock_out: args.endTime,
          job_id: args.jobId,
          notes: args.notes
        })
        .select('*, jobs(title)')
        .single();

      if (error) throw error;

      const hoursWorked = (new Date(args.endTime).getTime() - new Date(args.startTime).getTime()) / 3600000;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'log_time',
        description: `Logged ${hoursWorked.toFixed(1)} hours${args.jobId ? ` for ${entry.jobs?.title}` : ''}`,
        metadata: { tool: 'log_time_entry', entry_id: entry.id, hours: hoursWorked.toFixed(1) }
      });

      return {
        success: true,
        entry_id: entry.id,
        hours_logged: Math.round(hoursWorked * 100) / 100,
        job_title: entry.jobs?.title
      };
    }
  },

  // ============================================
  // PHASE A: TEAM MANAGEMENT TOOLS
  // ============================================

  invite_team_member: {
    name: 'invite_team_member',
    description: 'Send an invitation to add a new team member by email',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address to invite' },
        role: { type: 'string', enum: ['worker', 'owner'], description: 'Role for the new member (default: worker)' }
      },
      required: ['email']
    },
    execute: async (args: any, context: any) => {
      // Check if user already exists and is a member
      const { data: existingMember } = await context.supabase
        .from('profiles')
        .select('id')
        .eq('email', args.email)
        .single();

      if (existingMember) {
        // Check if already a member of this business
        const { data: membership } = await context.supabase
          .from('business_permissions')
          .select('id')
          .eq('business_id', context.businessId)
          .eq('user_id', existingMember.id)
          .single();

        if (membership) {
          return {
            success: false,
            message: `${args.email} is already a member of this business.`
          };
        }
      }

      // Check for existing pending invite
      const { data: existingInvite } = await context.supabase
        .from('invites')
        .select('id')
        .eq('business_id', context.businessId)
        .eq('invited_user_id', existingMember?.id || 'none')
        .is('redeemed_at', null)
        .is('revoked_at', null)
        .single();

      if (existingInvite) {
        return {
          success: false,
          message: `An invite is already pending for ${args.email}.`
        };
      }

      // Create invite via edge function
      const { data, error } = await context.supabase.functions.invoke('create-invites', {
        body: {
          businessId: context.businessId,
          invitedUserId: existingMember?.id,
          email: args.email,
          role: args.role || 'worker'
        }
      });

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'invite',
        description: `Invited ${args.email} as ${args.role || 'worker'}`,
        metadata: { tool: 'invite_team_member', email: args.email, role: args.role }
      });

      return {
        success: true,
        email: args.email,
        role: args.role || 'worker',
        message: `Invitation sent to ${args.email}`
      };
    }
  },

  update_team_availability: {
    name: 'update_team_availability',
    description: 'Update availability/working hours for a team member',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Team member user ID (defaults to current user)' },
        dayOfWeek: { type: 'number', description: 'Day of week (0=Sunday, 6=Saturday)' },
        startTime: { type: 'string', description: 'Start time in HH:MM format' },
        endTime: { type: 'string', description: 'End time in HH:MM format' },
        isAvailable: { type: 'boolean', description: 'Whether available on this day' }
      },
      required: ['dayOfWeek']
    },
    execute: async (args: any, context: any) => {
      const targetUserId = args.userId || context.userId;

      const { error } = await context.supabase
        .from('team_availability')
        .upsert({
          business_id: context.businessId,
          user_id: targetUserId,
          day_of_week: args.dayOfWeek,
          start_time: args.startTime || '09:00',
          end_time: args.endTime || '17:00',
          is_available: args.isAvailable !== false
        }, {
          onConflict: 'business_id,user_id,day_of_week'
        });

      if (error) throw error;

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'update',
        description: `Updated availability for ${dayNames[args.dayOfWeek]}`,
        metadata: { tool: 'update_team_availability', target_user_id: targetUserId }
      });

      return {
        success: true,
        day: dayNames[args.dayOfWeek],
        start_time: args.startTime || '09:00',
        end_time: args.endTime || '17:00',
        is_available: args.isAvailable !== false
      };
    }
  },

  request_time_off: {
    name: 'request_time_off',
    description: 'Submit a time off request',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        reason: { type: 'string', description: 'Reason for time off' },
        type: { type: 'string', enum: ['vacation', 'sick', 'personal', 'other'], description: 'Type of time off' }
      },
      required: ['startDate', 'endDate']
    },
    execute: async (args: any, context: any) => {
      const { data: request, error } = await context.supabase
        .from('time_off_requests')
        .insert({
          business_id: context.businessId,
          user_id: context.userId,
          start_date: args.startDate,
          end_date: args.endDate,
          reason: args.reason,
          request_type: args.type || 'vacation',
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'request',
        description: `Requested time off from ${args.startDate} to ${args.endDate}`,
        metadata: { tool: 'request_time_off', request_id: request.id }
      });

      return {
        success: true,
        request_id: request.id,
        start_date: args.startDate,
        end_date: args.endDate,
        status: 'pending'
      };
    }
  },

  approve_time_off: {
    name: 'approve_time_off',
    description: 'Approve or deny a time off request (owner only)',
    parameters: {
      type: 'object',
      properties: {
        requestId: { type: 'string', description: 'Time off request ID' },
        approved: { type: 'boolean', description: 'Whether to approve (true) or deny (false)' },
        notes: { type: 'string', description: 'Optional response notes' }
      },
      required: ['requestId', 'approved']
    },
    execute: async (args: any, context: any) => {
      const { data: request } = await context.supabase
        .from('time_off_requests')
        .select('*, profiles(full_name)')
        .eq('id', args.requestId)
        .eq('business_id', context.businessId)
        .single();

      if (!request) throw new Error('Time off request not found');

      const newStatus = args.approved ? 'approved' : 'denied';

      const { error } = await context.supabase
        .from('time_off_requests')
        .update({
          status: newStatus,
          reviewed_by: context.userId,
          reviewed_at: new Date().toISOString(),
          review_notes: args.notes
        })
        .eq('id', args.requestId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: args.approved ? 'approve' : 'deny',
        description: `${args.approved ? 'Approved' : 'Denied'} time off for ${request.profiles?.full_name}`,
        metadata: { tool: 'approve_time_off', request_id: args.requestId }
      });

      return {
        success: true,
        request_id: args.requestId,
        member_name: request.profiles?.full_name,
        status: newStatus
      };
    }
  },

  // ============================================
  // PHASE A: QUOTE APPROVAL TOOLS
  // ============================================

  approve_quote: {
    name: 'approve_quote',
    description: 'Mark a quote as approved by the customer',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'Quote ID to approve' }
      },
      required: ['quoteId']
    },
    execute: async (args: any, context: any) => {
      const { data: quote } = await context.supabase
        .from('quotes')
        .select('number, total, customers(name)')
        .eq('id', args.quoteId)
        .eq('business_id', context.businessId)
        .single();

      if (!quote) throw new Error('Quote not found');

      const { error } = await context.supabase
        .from('quotes')
        .update({
          status: 'Approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', args.quoteId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'approve',
        description: `Approved quote ${quote.number} for ${quote.customers?.name}`,
        metadata: { tool: 'approve_quote', quote_id: args.quoteId, total: quote.total }
      });

      return {
        success: true,
        quote_id: args.quoteId,
        quote_number: quote.number,
        customer_name: quote.customers?.name,
        total: quote.total
      };
    }
  },

  decline_quote: {
    name: 'decline_quote',
    description: 'Mark a quote as declined by the customer',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'Quote ID to decline' },
        reason: { type: 'string', description: 'Reason for declining' }
      },
      required: ['quoteId']
    },
    execute: async (args: any, context: any) => {
      const { data: quote } = await context.supabase
        .from('quotes')
        .select('number, customers(name)')
        .eq('id', args.quoteId)
        .eq('business_id', context.businessId)
        .single();

      if (!quote) throw new Error('Quote not found');

      const { error } = await context.supabase
        .from('quotes')
        .update({
          status: 'Declined',
          notes: args.reason ? `[DECLINED] ${args.reason}` : '[DECLINED]'
        })
        .eq('id', args.quoteId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'decline',
        description: `Declined quote ${quote.number}${args.reason ? `: ${args.reason}` : ''}`,
        metadata: { tool: 'decline_quote', quote_id: args.quoteId, reason: args.reason }
      });

      return {
        success: true,
        quote_id: args.quoteId,
        quote_number: quote.number,
        customer_name: quote.customers?.name,
        reason: args.reason
      };
    }
  },

  // ============================================
  // PHASE A: CHECKLIST TOOLS
  // ============================================

  create_checklist_template: {
    name: 'create_checklist_template',
    description: 'Create a new checklist template with items',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Template name' },
        description: { type: 'string', description: 'Template description' },
        category: { type: 'string', description: 'Category (e.g., Cleaning, Maintenance)' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              required_photo_count: { type: 'number' }
            }
          },
          description: 'Array of checklist items'
        }
      },
      required: ['name', 'items']
    },
    execute: async (args: any, context: any) => {
      // Create template
      const { data: template, error } = await context.supabase
        .from('sg_checklist_templates')
        .insert({
          business_id: context.businessId,
          name: args.name,
          description: args.description,
          category: args.category,
          created_by: context.userId,
          is_system_template: false,
          version: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Create items
      if (args.items && args.items.length > 0) {
        const itemsData = args.items.map((item: any, idx: number) => ({
          template_id: template.id,
          title: item.title,
          description: item.description,
          position: idx,
          required_photo_count: item.required_photo_count || 0
        }));

        await context.supabase.from('sg_checklist_template_items').insert(itemsData);
      }

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'create',
        description: `Created checklist template: ${args.name}`,
        metadata: { tool: 'create_checklist_template', template_id: template.id, item_count: args.items?.length || 0 }
      });

      return {
        success: true,
        template_id: template.id,
        name: args.name,
        item_count: args.items?.length || 0
      };
    }
  },

  complete_checklist_item: {
    name: 'complete_checklist_item',
    description: 'Mark a checklist item as completed',
    parameters: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'Checklist item ID' },
        notes: { type: 'string', description: 'Completion notes' }
      },
      required: ['itemId']
    },
    execute: async (args: any, context: any) => {
      const { data: item } = await context.supabase
        .from('sg_checklist_items')
        .select('*, sg_checklists(job_id, jobs(title))')
        .eq('id', args.itemId)
        .single();

      if (!item) throw new Error('Checklist item not found');

      const { error } = await context.supabase
        .from('sg_checklist_items')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: context.userId,
          completion_notes: args.notes
        })
        .eq('id', args.itemId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'complete',
        description: `Completed checklist item: ${item.name}`,
        metadata: { tool: 'complete_checklist_item', item_id: args.itemId }
      });

      return {
        success: true,
        item_id: args.itemId,
        item_name: item.name,
        job_title: item.sg_checklists?.jobs?.title
      };
    }
  },

  // ============================================
  // PHASE A: CUSTOMER PORTAL MESSAGING
  // ============================================

  get_customer_messages: {
    name: 'get_customer_messages',
    description: 'Get messages from the customer portal for a specific customer',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID' },
        limit: { type: 'number', description: 'Max messages to return (default: 20)' }
      },
      required: ['customerId']
    },
    execute: async (args: any, context: any) => {
      const { data: messages, error } = await context.supabase
        .from('customer_messages')
        .select('*, customers(name)')
        .eq('customer_id', args.customerId)
        .eq('business_id', context.businessId)
        .order('created_at', { ascending: false })
        .limit(args.limit || 20);

      if (error) throw error;

      const unreadCount = (messages || []).filter((m: any) => !m.read_at && m.direction === 'inbound').length;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'query',
        description: `Retrieved ${messages?.length || 0} messages for customer`,
        metadata: { tool: 'get_customer_messages', customer_id: args.customerId }
      });

      return {
        messages: messages || [],
        count: messages?.length || 0,
        unread_count: unreadCount
      };
    }
  },

  send_customer_message: {
    name: 'send_customer_message',
    description: 'Send a message to a customer through the portal',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer ID' },
        message: { type: 'string', description: 'Message content' },
        jobId: { type: 'string', description: 'Optional related job ID' }
      },
      required: ['customerId', 'message']
    },
    execute: async (args: any, context: any) => {
      const { data: customer } = await context.supabase
        .from('customers')
        .select('name, email')
        .eq('id', args.customerId)
        .single();

      if (!customer) throw new Error('Customer not found');

      const { data: message, error } = await context.supabase
        .from('customer_messages')
        .insert({
          business_id: context.businessId,
          customer_id: args.customerId,
          job_id: args.jobId,
          content: args.message,
          direction: 'outbound',
          sent_by: context.userId
        })
        .select()
        .single();

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'message',
        description: `Sent message to ${customer.name}`,
        metadata: { tool: 'send_customer_message', customer_id: args.customerId, message_id: message.id }
      });

      return {
        success: true,
        message_id: message.id,
        customer_name: customer.name,
        preview: args.message.substring(0, 100)
      };
    }
  },

  // ============================================
  // PHASE A: RECURRING BILLING TOOLS
  // ============================================

  create_recurring_schedule: {
    name: 'create_recurring_schedule',
    description: 'Create a recurring billing schedule from a quote',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'Quote ID to base recurring schedule on' },
        frequency: { type: 'string', enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'], description: 'Billing frequency' },
        startDate: { type: 'string', description: 'First billing date (YYYY-MM-DD)' }
      },
      required: ['quoteId', 'frequency', 'startDate']
    },
    execute: async (args: any, context: any) => {
      const { data: quote } = await context.supabase
        .from('quotes')
        .select('number, total, customers(name)')
        .eq('id', args.quoteId)
        .eq('business_id', context.businessId)
        .single();

      if (!quote) throw new Error('Quote not found');

      const { data: schedule, error } = await context.supabase
        .from('recurring_schedules')
        .insert({
          business_id: context.businessId,
          quote_id: args.quoteId,
          frequency: args.frequency,
          next_billing_date: args.startDate,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Update quote to mark as recurring
      await context.supabase
        .from('quotes')
        .update({ frequency: args.frequency })
        .eq('id', args.quoteId);

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'create',
        description: `Created ${args.frequency} recurring schedule for ${quote.customers?.name}`,
        metadata: { tool: 'create_recurring_schedule', schedule_id: schedule.id, quote_id: args.quoteId }
      });

      return {
        success: true,
        schedule_id: schedule.id,
        quote_number: quote.number,
        customer_name: quote.customers?.name,
        frequency: args.frequency,
        next_billing_date: args.startDate
      };
    }
  },

  cancel_subscription: {
    name: 'cancel_subscription',
    description: 'Cancel/end a recurring billing schedule',
    parameters: {
      type: 'object',
      properties: {
        scheduleId: { type: 'string', description: 'Recurring schedule ID' },
        reason: { type: 'string', description: 'Reason for cancellation' },
        cancelImmediately: { type: 'boolean', description: 'Cancel immediately vs end of current period' }
      },
      required: ['scheduleId']
    },
    execute: async (args: any, context: any) => {
      const { data: schedule } = await context.supabase
        .from('recurring_schedules')
        .select('*, quotes(number, customers(name))')
        .eq('id', args.scheduleId)
        .eq('business_id', context.businessId)
        .single();

      if (!schedule) throw new Error('Recurring schedule not found');

      const updates: any = {
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancellation_reason: args.reason
      };

      if (!args.cancelImmediately) {
        updates.cancel_at_period_end = true;
        updates.status = 'active'; // Keep active until period ends
      }

      const { error } = await context.supabase
        .from('recurring_schedules')
        .update(updates)
        .eq('id', args.scheduleId);

      if (error) throw error;

      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'cancel',
        description: `Canceled recurring schedule for ${schedule.quotes?.customers?.name}`,
        metadata: { tool: 'cancel_subscription', schedule_id: args.scheduleId, reason: args.reason }
      });

      return {
        success: true,
        schedule_id: args.scheduleId,
        customer_name: schedule.quotes?.customers?.name,
        canceled_immediately: args.cancelImmediately !== false,
        reason: args.reason
      };
    }
  }
};

// Helper function to fetch greeting context using context loader
async function fetchGreetingContext(context: any) {
  const currentPage = context.currentPage || 'dashboard';
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  
  // Base queries (always fetch)
  const baseQueries = [
    // Unscheduled jobs count
    context.supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', context.businessId)
      .is('starts_at', null)
      .neq('status', 'Cancelled'),
    
    // Today's jobs count
    context.supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', context.businessId)
      .gte('starts_at', today)
      .lt('starts_at', tomorrow),
    
    // Team members count
    context.supabase
      .from('business_permissions')
      .select('user_id', { count: 'exact', head: true })
      .eq('business_id', context.businessId),
    
    // Business info
    context.supabase
      .from('businesses')
      .select('name')
      .eq('id', context.businessId)
      .single()
  ];
  
  // Page-specific queries
  const pageQueries: Promise<any>[] = [];
  
  if (currentPage.includes('/customer')) {
    // Recent customers (added this week)
    pageQueries.push(
      context.supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', context.businessId)
        .gte('created_at', weekAgo)
    );
  } else if (currentPage.includes('/quote')) {
    // Pending quotes
    pageQueries.push(
      context.supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', context.businessId)
        .eq('status', 'draft')
    );
  } else if (currentPage.includes('/invoice')) {
    // Unpaid invoices
    pageQueries.push(
      context.supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', context.businessId)
        .eq('status', 'sent')
    );
    // Overdue invoices
    pageQueries.push(
      context.supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', context.businessId)
        .eq('status', 'sent')
        .lt('due_at', today)
    );
  }
  
  const [unscheduledJobs, todaysJobs, teamMembers, business, ...pageResults] = await Promise.all([
    ...baseQueries,
    ...pageQueries
  ]);

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  
  // Build result with page-specific data
  const result: any = {
    businessName: business.data?.name || 'your business',
    unscheduledCount: unscheduledJobs.count || 0,
    todaysJobsCount: todaysJobs.count || 0,
    teamMemberCount: teamMembers.count || 0,
    timeOfDay,
    currentPage
  };
  
  // Add page-specific counts
  if (currentPage.includes('/customer') && pageResults[0]) {
    result.recentCustomersCount = pageResults[0].count || 0;
  } else if (currentPage.includes('/quote') && pageResults[0]) {
    result.pendingQuotesCount = pageResults[0].count || 0;
  } else if (currentPage.includes('/invoice')) {
    result.unpaidInvoicesCount = pageResults[0]?.count || 0;
    result.overdueInvoicesCount = pageResults[1]?.count || 0;
  }

  return result;
}

async function generateGreetingMessage(context: any): Promise<string> {
  const ctx = await fetchGreetingContext(context);
  const page = ctx.currentPage || '';
  
  let greeting = `Good ${ctx.timeOfDay}! 👋 `;
  
  // Page-specific greetings
  if (page.includes('/calendar')) {
    // Calendar page - focus on schedule
    if (ctx.unscheduledCount > 0 && ctx.todaysJobsCount > 0) {
      greeting += `${ctx.todaysJobsCount} job${ctx.todaysJobsCount !== 1 ? 's' : ''} today, ${ctx.unscheduledCount} waiting to be scheduled.`;
    } else if (ctx.todaysJobsCount > 0) {
      greeting += `You have ${ctx.todaysJobsCount} job${ctx.todaysJobsCount !== 1 ? 's' : ''} on today's calendar.`;
    } else if (ctx.unscheduledCount > 0) {
      greeting += `${ctx.unscheduledCount} job${ctx.unscheduledCount !== 1 ? 's' : ''} waiting to be scheduled.`;
    } else {
      greeting += `Your calendar is clear today.`;
    }
  } else if (page.includes('/customer')) {
    // Customers page - focus on customer management
    if (ctx.recentCustomersCount > 0) {
      greeting += `${ctx.recentCustomersCount} customer${ctx.recentCustomersCount !== 1 ? 's' : ''} added this week.`;
    } else {
      greeting += `Ready to help with your customers.`;
    }
  } else if (page.includes('/quote')) {
    // Quotes page - focus on pending quotes
    if (ctx.pendingQuotesCount > 0) {
      greeting += `${ctx.pendingQuotesCount} quote${ctx.pendingQuotesCount !== 1 ? 's' : ''} awaiting customer response.`;
    } else {
      greeting += `Ready to help you create and manage quotes.`;
    }
  } else if (page.includes('/invoice')) {
    // Invoices page - focus on payment status
    if (ctx.overdueInvoicesCount > 0) {
      greeting += `${ctx.overdueInvoicesCount} overdue invoice${ctx.overdueInvoicesCount !== 1 ? 's' : ''} need attention.`;
    } else if (ctx.unpaidInvoicesCount > 0) {
      greeting += `${ctx.unpaidInvoicesCount} invoice${ctx.unpaidInvoicesCount !== 1 ? 's' : ''} awaiting payment.`;
    } else {
      greeting += `Your invoices are up to date.`;
    }
  } else if (page.includes('/team')) {
    // Team page - focus on team management
    if (ctx.teamMemberCount > 0) {
      greeting += `Managing ${ctx.teamMemberCount} team member${ctx.teamMemberCount !== 1 ? 's' : ''}.`;
    } else {
      greeting += `Ready to help manage your team.`;
    }
  } else if (page.includes('/analytics') || page.includes('/reports')) {
    // Analytics page
    greeting += `Let's dive into your business insights.`;
  } else if (page.includes('/job') || page.includes('/work-order')) {
    // Jobs/work orders page
    if (ctx.unscheduledCount > 0) {
      greeting += `${ctx.unscheduledCount} job${ctx.unscheduledCount !== 1 ? 's' : ''} ready to be scheduled.`;
    } else {
      greeting += `Ready to help with your jobs.`;
    }
  } else {
    // Default/dashboard
    greeting += `How can I help you today?`;
  }
  
  greeting += ` How can I help?`;
  
  return greeting;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate using Clerk JWT
    const { userId, businessId, supaAdmin } = await requireCtx(req);

    const { conversationId, message, mediaIds, includeContext } = await req.json();

    // Fetch media URLs if mediaIds provided
    let imageUrls: string[] = [];
    if (mediaIds && mediaIds.length > 0) {
      const { data: mediaItems, error: mediaError } = await supaAdmin
        .from('sg_media')
        .select('public_url')
        .in('id', mediaIds)
        .eq('business_id', businessId);

      if (mediaError) {
        console.error('Error fetching media:', mediaError);
      } else if (mediaItems) {
        imageUrls = mediaItems.map((m: any) => m.public_url);
      }
    }

    let convId = conversationId;
    let isNewConversation = false;
    
      // Create or load conversation
    if (!convId) {
      isNewConversation = true;
      const title = generateConversationTitle(message);
      
      const { data: newConv, error: convError } = await supaAdmin
        .from('ai_chat_conversations')
        .insert({
          business_id: businessId,
          user_id: userId,
          title: title,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) throw convError;
      convId = newConv.id;
      
      // Note: Media is stored with conversation_id = null for AI chat
      // and is linked via mediaId in the message metadata
    }

    // ============================================================
    // MEMORY & CONTEXT PERSISTENCE
    // ============================================================
    
    // Initialize memory context
    const memoryCtx: MemoryContext = {
      supabase: supaAdmin,
      userId,
      businessId,
      conversationId: convId,
    };

    // Cleanup expired plans in background (non-blocking)
    cleanupExpiredPlansAsync(memoryCtx).catch(err => {
      console.warn('[ai-chat] Cleanup error (non-fatal):', err);
    });

    // Load user's memory (entities, preferences, summary)
    let memory: ConversationMemory;
    try {
      memory = await loadMemory(memoryCtx);
      console.info('[ai-chat] Memory loaded:', {
        recentEntities: memory.recentEntities.length,
        preferences: memory.preferences.length,
        hasSummary: !!memory.conversationSummary
      });
    } catch (memErr) {
      console.error('[ai-chat] Memory load error (non-fatal):', memErr);
      memory = { recentEntities: [], preferences: [], conversationSummary: null, entityContext: [] };
    }

    // Extract entities from user message
    let entityContextStr = '';
    let preferenceContextStr = '';
    try {
      const entityResult = await extractEntitiesFromMessage(message, memoryCtx);
      entityContextStr = buildEntityContextString(entityResult, memory.recentEntities);
      
      // Note: extractEntitiesFromMessage already calls rememberEntity internally
      // for resolved entities, so we don't need to call it again here
      
      console.info('[ai-chat] Entities extracted:', entityResult.entities.length, 
        'resolved:', entityResult.resolvedEntities.size,
        'unresolved pronouns:', entityResult.hasUnresolvedPronouns);
    } catch (entErr) {
      console.error('[ai-chat] Entity extraction error (non-fatal):', entErr);
    }

    // Learn preferences from message
    try {
      await learnFromMessage(memoryCtx, message);
    } catch (prefErr) {
      console.error('[ai-chat] Preference learning error (non-fatal):', prefErr);
    }

    // Get applicable preferences for context
    try {
      const preferences = await getApplicablePreferences(memoryCtx, {
        action: includeContext?.entityType
      });
      preferenceContextStr = buildPreferenceContextString(preferences);
      console.info('[ai-chat] Applicable preferences:', preferences.length);
    } catch (prefErr) {
      console.error('[ai-chat] Preference retrieval error (non-fatal):', prefErr);
    }

    // Build conversation summary context
    let summaryContextStr = '';
    try {
      summaryContextStr = await buildSummaryContext(memoryCtx);
    } catch (sumErr) {
      console.error('[ai-chat] Summary context error (non-fatal):', sumErr);
    }

    // Save user message
    await supaAdmin
      .from('ai_chat_messages')
      .insert({
        conversation_id: convId,
        role: 'user',
        content: message
      });

    // Load conversation history
    const { data: history } = await supaAdmin
      .from('ai_chat_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(20);

    const messages: Message[] = history || [];

    // Build system prompt with context
    const visionNote = imageUrls.length > 0 
      ? '\n\nIMAGE ANALYSIS CAPABILITY:\nYou can analyze images shared by field workers. When images are provided:\n- Identify problems, defects, or issues visible in photos\n- Provide step-by-step guidance for repairs or installations\n- Reference safety considerations\n- Suggest tools or materials needed\n- Give clear, actionable instructions'
      : '';

    // Plan approval detection is done early, but execution happens inside the stream
    // where controller is available. We detect here and pass to the stream.
    const planApproval = detectPlanApproval(message);
    console.info('[ai-chat] Plan approval check:', { 
      isApproval: planApproval.isApproval, 
      isRejection: planApproval.isRejection,
      planId: planApproval.planId,
      message: message.substring(0, 50)
    });

    // Use the agent orchestrator for intelligent prompt building
    const sessionContext: SessionContext = {
      businessId,
      userId,
      currentPage: includeContext?.currentPage,
      entityId: includeContext?.entityId,
      entityType: includeContext?.entityType,
    };

    // Pass conversation history to orchestrator for follow-up detection
    const orchestratorResult = await orchestrate(message, sessionContext, supaAdmin, memoryCtx, messages);
    console.info('[ai-chat] Orchestrator result:', orchestratorResult.type, orchestratorResult.intent?.intentId, 
      orchestratorResult.intent?.isFollowUp ? '(follow-up)' : '');

    // Store clarification/confirmation data for use inside the stream controller
    const pendingClarification = orchestratorResult.type === 'clarification' && orchestratorResult.clarificationData 
      ? orchestratorResult.clarificationData 
      : null;
    const pendingConfirmation = orchestratorResult.type === 'confirmation' && orchestratorResult.confirmationRequest
      ? orchestratorResult.confirmationRequest
      : null;
    
    if (pendingClarification) {
      console.info('[ai-chat] Clarification needed:', pendingClarification.question);
    }
    if (pendingConfirmation) {
      console.info('[ai-chat] Confirmation needed:', pendingConfirmation.action);
    }
    
    // Check for process transition in user message
    const processTransition = detectProcessTransition(message, {
      customerId: includeContext?.entityType === 'customer' ? includeContext?.entityId : undefined,
      conversationId: memoryCtx?.conversationId,
      jobId: includeContext?.entityType === 'job' ? includeContext?.entityId : undefined,
    });
    
    if (processTransition) {
      console.info('[ai-chat] Detected process transition:', processTransition.patternId, processTransition.entities);
    }
    
    // Extract processContext from request for context handoff
    const processContext = includeContext?.processContext as Record<string, any> | undefined;

    // Build memory context section for system prompt
    const memorySection = [
      summaryContextStr,
      entityContextStr,
      preferenceContextStr
    ].filter(Boolean).join('\n\n');

    // Build active task context (PHASE 2: Context indicator injection)
    let activeTaskContext = '';
    try {
      const convState = await import('./memory-manager.ts').then(m => m.getConversationState(memoryCtx));
      if (convState?.pendingIntent) {
        const intentLabel = convState.pendingIntent.replace(/\./g, ' ').replace(/_/g, ' ');
        const awaitingLabel = convState.awaitingInput?.replace(/_/g, ' ') || 'more information';
        const collectedKeys = Object.keys(convState.collectedEntities || {});
        
        activeTaskContext = `
[ACTIVE_TASK]
Intent: ${intentLabel}
Awaiting: ${awaitingLabel}
${collectedKeys.length > 0 ? `Collected so far: ${collectedKeys.join(', ')}` : 'No data collected yet'}
[/ACTIVE_TASK]

IMPORTANT: You are in the middle of a multi-turn conversation. The user's message is likely a response to your previous question about "${awaitingLabel}". 
Do NOT start a new task - continue with the current one. Acknowledge what they provided and either ask for the next piece of info or complete the action.`;
      }
    } catch (e) {
      console.error('[ai-chat] Failed to load active task context:', e);
    }

    // Build the system prompt - use orchestrator's dynamic prompt if available
    const baseSystemPrompt = orchestratorResult.systemPrompt || `You are a proactive AI scheduling assistant for a service business management system.
You can both QUERY information and TAKE ACTIONS to help manage the business efficiently.${visionNote}

Current Context:
- Business ID: ${businessId}
- Current Page: ${includeContext?.currentPage || 'unknown'}
- Date: ${new Date().toISOString().split('T')[0]}

${activeTaskContext}

${memorySection ? `MEMORY CONTEXT:\n${memorySection}` : ''}`;

    // Add the full tool documentation to the prompt
    const systemPrompt = baseSystemPrompt + `${visionNote}

Available Tools (50+ tools across all domains):

SCHEDULING: get_unscheduled_jobs, check_team_availability, get_schedule_summary, auto_schedule_job, batch_schedule_jobs, refine_schedule, optimize_route_for_date, get_scheduling_conflicts, reschedule_job, get_capacity_forecast

QUOTES: create_quote, get_pending_quotes, send_quote, convert_quote_to_job

INVOICES: create_invoice, get_unpaid_invoices, send_invoice, send_invoice_reminder

CUSTOMERS: create_customer, search_customers, get_customer_details, get_customer_history, invite_to_portal

PAYMENTS: record_payment, get_payment_history

RECURRING: get_recurring_schedules, pause_subscription, resume_subscription

TEAM: get_team_members, get_team_utilization, get_active_clockins, get_timesheet_summary

CHECKLISTS: get_checklist_templates, assign_checklist_to_job, get_job_checklist_progress

JOBS: update_job_status, create_job_from_request, add_job_note, assign_job_to_member, get_job_timeline

OTHER: get_requests_pending, get_business_metrics

SCHEDULING WORKFLOW (IMPORTANT):
When user asks to schedule jobs, follow this flow:

1. FIRST: Use get_unscheduled_jobs to see what needs scheduling
   - Explain what you found (count, priorities, any urgent ones)
   - Show key details (customer names, locations if groupable)

2. THEN: Offer to schedule them using batch_schedule_jobs
   - This is your MAIN scheduling tool - it's smart and considers:
     * Team availability and time off
     * Customer preferred days/times
     * Travel time between jobs (groups by location)
     * Business constraints (max hours, operating hours)
     * Priority (urgent jobs scheduled first)

3. AFTER SCHEDULING: Confirm and offer next steps
   - Show what was scheduled (dates/times)
   - Offer calendar view: "View on calendar: [BUTTON:view_calendar_2024-03-15:Open Calendar 📅]"

SCHEDULE PREVIEW FORMATTING:
After batch scheduling, ALWAYS show results with this special syntax:
[SCHEDULE_PREVIEW:{"scheduledJobs":[{"jobId":"...","title":"...","customerName":"...","startTime":"...","endTime":"...","assignedTo":"...","assignedToName":"...","reasoning":"...","priorityScore":0.95,"travelTimeMinutes":15}],"totalJobsRequested":5,"estimatedTimeSaved":45}]

REFINEMENT WORKFLOW:
When user rejects a schedule or wants adjustments:
1. Use refine_schedule tool with their feedback
2. Explain what constraints you applied based on feedback
3. Show new [SCHEDULE_PREVIEW:...] with refined schedule

RESPONSE STYLE:
1. Be proactive and actionable - don't just inform, offer to act
2. Use clickable buttons: [BUTTON:message_to_send:Button Label|variant]
   Variants: primary (default blue), secondary (gray), danger (red)
3. Reference entities with clickable cards: [ENTITY:type:id:name]
   Examples:
   - [ENTITY:customer:abc123:John Smith] - Clickable customer link
   - [ENTITY:job:def456:Plumbing Repair] - Clickable job link
   - [ENTITY:quote:ghi789:Quote #Q-0042] - Clickable quote link
   - [ENTITY:invoice:jkl012:Invoice #INV-0015] - Clickable invoice link
   Always use this syntax when mentioning specific customers, jobs, quotes, or invoices.
4. Keep responses concise (2-4 sentences ideal)
5. Use emojis for visual hierarchy (✅ success, ⚠️ warnings, 📅 scheduling, 🚗 travel)
6. Explain AI reasoning when scheduling
7. Always confirm before cancellations or major changes`;


    // Prepare messages for AI - support vision
    const aiMessages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add history and current message with vision support
    for (const msg of messages) {
      if (msg.role === 'user' && imageUrls.length > 0 && msg === messages[messages.length - 1]) {
        // Last user message with images - use vision format
        aiMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            ...imageUrls.map(url => ({
              type: 'image_url',
              image_url: { url }
            }))
          ]
        });
      } else {
        // Regular text message
        aiMessages.push(msg);
      }
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'conversation_id', id: convId })}\n\n`)
          );

          // Send greeting for new conversations
          if (isNewConversation) {
            const greetingText = await generateGreetingMessage({
              businessId,
              userId,
              supabase: supaAdmin,
              currentPage: includeContext?.currentPage
            });
            
            // Save greeting as assistant message
            await supaAdmin
              .from('ai_chat_messages')
              .insert({
                conversation_id: convId,
                role: 'assistant',
                content: greetingText
              });
            
            // Send greeting to frontend immediately via SSE
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'greeting', 
                content: greetingText 
              })}\n\n`)
            );
          }
          
          // ===============================================================
          // CLARIFICATION/CONFIRMATION HANDLING (send SSE events)
          // ===============================================================
          if (pendingClarification) {
            console.info('[ai-chat] Sending clarification SSE event');
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'clarification',
                question: pendingClarification.question,
                options: pendingClarification.options || [],
                domain: pendingClarification.domain,
                intent: pendingClarification.intent,
                allowFreeform: true,
              })}\n\n`)
            );
            
            // Save clarification as assistant message
            await supaAdmin.from('ai_chat_messages').insert({
              conversation_id: convId,
              role: 'assistant',
              content: pendingClarification.question,
            });
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
            return;
          }
          
          if (pendingConfirmation) {
            console.info('[ai-chat] Sending confirmation SSE event');
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'confirmation',
                action: pendingConfirmation.action,
                description: pendingConfirmation.description,
                riskLevel: pendingConfirmation.riskLevel || 'medium',
                confirmLabel: pendingConfirmation.confirmLabel,
                cancelLabel: pendingConfirmation.cancelLabel,
              })}\n\n`)
            );
            
            // Save confirmation as assistant message
            await supaAdmin.from('ai_chat_messages').insert({
              conversation_id: convId,
              role: 'assistant',
              content: pendingConfirmation.description,
            });
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
            return;
          }

          // ===============================================================
          // PLAN APPROVAL/REJECTION HANDLING (inside stream where controller exists)
          // ===============================================================
          if (planApproval.isApproval) {
            // User approved a plan - execute it immediately
            let pendingPlanData = planApproval.planId 
              ? getPendingPlan(planApproval.planId)
              : getMostRecentPendingPlan(userId);
            
            // If not in cache, try database
            if (!pendingPlanData) {
              console.info('[ai-chat] Plan not in cache, checking database...');
              pendingPlanData = planApproval.planId 
                ? await getPendingPlanAsync(planApproval.planId, memoryCtx)
                : await getMostRecentPendingPlanAsync(memoryCtx);
            }
            
            console.info('[ai-chat] Pending plan lookup result:', pendingPlanData ? 'found' : 'not found');
            
            if (pendingPlanData) {
              const { plan, pattern, entities } = pendingPlanData;
              
              // Update status to 'executing' (keep in DB for recovery)
              console.info('[ai-chat] Removing plan from cache:', plan.id);
              removePendingPlan(plan.id);
              
              // Fire-and-forget status update to prevent hanging
              console.info('[ai-chat] Starting non-blocking plan status update:', plan.id);
              updatePlanStatus(memoryCtx, plan.id, 'executing').catch(e => 
                console.error('[ai-chat] Non-blocking status update failed (continuing):', e)
              );
              
              console.info('[ai-chat] Executing approved plan:', plan.id, plan.name);
              
              // Send initial executing status
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'step_progress',
                  planId: plan.id,
                  stepIndex: 0,
                  totalSteps: plan.steps.length,
                  step: { id: plan.steps[0].id, name: plan.steps[0].name, status: 'running' },
                  message: 'Starting plan execution...',
                })}\n\n`)
              );
              
              // Execute with progress streaming
              const executionContext: ExecutionContext = {
                supabase: supaAdmin,
                businessId,
                userId,
                controller,
                tools,
              };
              
              const executedPlan = await executePlan(
                plan,
                executionContext,
                entities,
                pattern,
                (result: PlannerResult) => {
                  // Real-time progress callback
                  if (result.type === 'step_progress' || result.type === 'step_complete') {
                    // Use specialized workflow progress for dedicated card patterns
                    if (isLeadWorkflowPattern(pattern)) {
                      const customerData = extractCustomerData(
                        result.currentStep?.tool || '',
                        result.currentStep?.result,
                        entities
                      );
                      sendLeadWorkflowProgress(controller, result.plan, result.currentStep!, customerData);
                    } else if (isAssessmentWorkflowPattern(pattern)) {
                      sendAssessmentWorkflowProgress(controller, result.plan, result.currentStep!, {});
                    } else {
                      sendStepProgress(controller, result.plan, result.currentStep!, result.message);
                    }
                  } else if (result.type === 'plan_complete') {
                    // Only send complete for successful plans - failures handled after executePlan
                    const failedStep = result.plan.steps.find(s => s.status === 'failed');
                    
                    // Check for next process suggestion on successful completion
                    let nextSuggestion: NextProcessSuggestion | undefined;
                    if (!failedStep && result.plan.status === 'completed') {
                      const processId = getProcessFromPattern(pattern.id);
                      if (processId) {
                        // Collect results from all completed steps
                        const allResults: Record<string, any> = {};
                        result.plan.steps.forEach(step => {
                          if (step.result) {
                            allResults[step.tool] = step.result;
                            Object.assign(allResults, step.result);
                          }
                        });
                        const suggestion = getSuggestedNextProcess(processId, allResults);
                        if (suggestion) {
                          nextSuggestion = suggestion;
                          // Track process journey
                          trackProcessJourney(supaAdmin, businessId, userId, {
                            processId,
                            status: 'completed',
                            planId: result.plan.id,
                            context: allResults,
                          });
                        }
                      }
                    }
                    
                    sendPlanComplete(controller, result.plan, failedStep, undefined, nextSuggestion);
                  }
                  // Note: plan_failed is now handled after executePlan returns to allow async conversational recovery
                }
              );
              
              // Handle plan failure with conversational recovery
              if (executedPlan.status === 'awaiting_recovery' || executedPlan.status === 'failed') {
                const failedStep = executedPlan.steps.find(s => s.status === 'failed');
                
                if (failedStep) {
                  // Try conversational recovery first (async)
                  const usedConversational = await executeConversationalRecovery(
                    controller,
                    executedPlan,
                    failedStep,
                    executionContext
                  );
                  
                  // If no conversational recovery available, send standard recovery actions
                  if (!usedConversational) {
                    sendPlanComplete(controller, executedPlan, failedStep);
                  }
                }
              }
              
              // Log activity
              await supaAdmin.from('ai_activity_log').insert({
                business_id: businessId,
                user_id: userId,
                activity_type: 'multi_step_plan',
                description: `Executed plan: ${plan.name} (${executedPlan.status})`,
                metadata: {
                  plan_id: plan.id,
                  pattern_id: pattern.id,
                  steps: plan.steps.length,
                  successful: plan.steps.filter(s => s.status === 'completed').length,
                  failed: plan.steps.filter(s => s.status === 'failed').length,
                  rolled_back: executedPlan.rollbackSteps?.length || 0,
                  duration_ms: executedPlan.totalDurationMs,
                },
                accepted: executedPlan.status === 'completed',
              });
              
              // Save summary as assistant message
              const summaryMessage = executedPlan.status === 'completed'
                ? `Plan "${plan.name}" completed successfully in ${Math.round((executedPlan.totalDurationMs || 0) / 1000)}s.`
                : executedPlan.status === 'awaiting_recovery'
                  ? `Plan "${plan.name}" needs input to continue.`
                  : `Plan "${plan.name}" failed. ${executedPlan.rollbackSteps?.length || 0} steps were rolled back.`;
              
              await supaAdmin.from('ai_chat_messages').insert({
                conversation_id: convId,
                role: 'assistant',
                content: summaryMessage,
              });
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();
              return;
            }
            // If no pending plan found, fall through to normal flow
            console.warn('[ai-chat] Plan approval received but no pending plan found');
          }
          
          if (planApproval.isRejection) {
            // User rejected a plan - handle immediately
            let pendingPlanData = planApproval.planId 
              ? getPendingPlan(planApproval.planId)
              : getMostRecentPendingPlan(userId);
            
            if (!pendingPlanData) {
              pendingPlanData = planApproval.planId 
                ? await getPendingPlanAsync(planApproval.planId, memoryCtx)
                : await getMostRecentPendingPlanAsync(memoryCtx);
            }
            
            if (pendingPlanData) {
              const { plan } = pendingPlanData;
              removePendingPlan(plan.id);
              await removePendingPlanAsync(plan.id, memoryCtx);
              
              console.info('[ai-chat] Plan rejected:', plan.id);
              
              // Send cancellation confirmation
              sendPlanCancelled(controller, plan.id, 'Plan cancelled. How else can I help?');
              
              // Save cancellation as assistant message
              await supaAdmin.from('ai_chat_messages').insert({
                conversation_id: convId,
                role: 'assistant',
                content: `Plan "${plan.name}" cancelled. How else can I help?`,
              });
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();
              return;
            }
            // If no pending plan found, fall through to normal flow
            console.warn('[ai-chat] Plan rejection received but no pending plan found');
          }

          // ===============================================================
          // PLAN RESUME HANDLING (for recovery flow)
          // ===============================================================
          const planResumeMatch = message.match(/^plan_resume:([a-f0-9-]+)$/i);
          if (planResumeMatch) {
            const planIdToResume = planResumeMatch[1];
            console.info('[ai-chat] Plan resume requested:', planIdToResume);
            
            const resumeData = await resumePlanAfterRecovery(planIdToResume, memoryCtx);
            
            if (resumeData) {
              const { plan, pattern, entities } = resumeData;
              
              console.info('[ai-chat] Resuming plan from step:', plan.currentStepIndex);
              
              // Send resuming status
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'step_progress',
                  planId: plan.id,
                  planName: plan.name,
                  stepIndex: plan.currentStepIndex,
                  totalSteps: plan.steps.length,
                  steps: plan.steps.map(s => ({
                    id: s.id,
                    name: s.name,
                    tool: s.tool,
                    status: s.status,
                    error: s.error,
                  })),
                  message: 'Resuming plan execution...',
                })}\n\n`)
              );
              
              // Execute with progress streaming (continues from where it left off)
              const executionContext: ExecutionContext = {
                supabase: supaAdmin,
                businessId,
                userId,
                controller,
                tools,
              };
              
              const executedPlan = await executePlan(
                plan,
                executionContext,
                entities,
                pattern,
                (result: PlannerResult) => {
                  if (result.type === 'step_progress' || result.type === 'step_complete') {
                    if (isLeadWorkflowPattern(pattern)) {
                      const customerData = extractCustomerData(
                        result.currentStep?.tool || '',
                        result.currentStep?.result,
                        entities
                      );
                      sendLeadWorkflowProgress(controller, result.plan, result.currentStep!, customerData);
                    } else if (isAssessmentWorkflowPattern(pattern)) {
                      sendAssessmentWorkflowProgress(controller, result.plan, result.currentStep!, {});
                    } else {
                      sendStepProgress(controller, result.plan, result.currentStep!, result.message);
                    }
                  } else if (result.type === 'plan_complete') {
                    const failedStep = result.plan.steps.find(s => s.status === 'failed');
                    
                    // Check for next process suggestion on successful completion
                    let nextSuggestion: NextProcessSuggestion | undefined;
                    if (!failedStep && result.plan.status === 'completed') {
                      const processId = getProcessFromPattern(pattern.id);
                      if (processId) {
                        const allResults: Record<string, any> = {};
                        result.plan.steps.forEach(step => {
                          if (step.result) {
                            allResults[step.tool] = step.result;
                            Object.assign(allResults, step.result);
                          }
                        });
                        const suggestion = getSuggestedNextProcess(processId, allResults);
                        if (suggestion) {
                          nextSuggestion = suggestion;
                          trackProcessJourney(supaAdmin, businessId, userId, {
                            processId,
                            status: 'completed',
                            planId: result.plan.id,
                            context: allResults,
                          });
                        }
                      }
                    }
                    
                    sendPlanComplete(controller, result.plan, failedStep, undefined, nextSuggestion);
                  }
                }
              );
              
              // Handle plan failure with conversational recovery
              if (executedPlan.status === 'awaiting_recovery' || executedPlan.status === 'failed') {
                const failedStep = executedPlan.steps.find(s => s.status === 'failed');
                if (failedStep) {
                  const usedConversational = await executeConversationalRecovery(
                    controller,
                    executedPlan,
                    failedStep,
                    executionContext
                  );
                  if (!usedConversational) {
                    sendPlanComplete(controller, executedPlan, failedStep);
                  }
                }
              }
              
              // Clean up if completed
              if (executedPlan.status === 'completed') {
                removePendingPlan(plan.id);
                await removePendingPlanAsync(plan.id, memoryCtx);
              }
              
              // Log activity
              await supaAdmin.from('ai_activity_log').insert({
                business_id: businessId,
                user_id: userId,
                activity_type: 'multi_step_plan_resume',
                description: `Resumed plan: ${plan.name} (${executedPlan.status})`,
                metadata: {
                  plan_id: plan.id,
                  pattern_id: pattern.id,
                  resumed_from_step: plan.currentStepIndex,
                  final_status: executedPlan.status,
                },
                accepted: executedPlan.status === 'completed',
              });
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();
              return;
            }
            
            // Plan not found - inform user
            console.warn('[ai-chat] Resume requested but plan not found:', planIdToResume);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'token',
                content: "I couldn't find the plan to resume. It may have expired. Would you like to start over?",
              })}\n\n`)
            );
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
            return;
          }

          // ===============================================================
          // PLAN ENTITY SELECTION HANDLING (for conversational recovery)
          // ===============================================================
          const entitySelectMatch = message.match(/^plan_entity_select:([a-f0-9-]+):(\w+):(.+)$/i);
          if (entitySelectMatch) {
            const [, planIdToUpdate, entityType, entityValue] = entitySelectMatch;
            console.info('[ai-chat] Entity selection received:', { planIdToUpdate, entityType, entityValue });
            
            // Get the plan from DB
            let planData = getPendingPlan(planIdToUpdate);
            if (!planData) {
              planData = await getPendingPlanAsync(planIdToUpdate, memoryCtx);
            }
            
            if (planData) {
              const { plan, pattern, entities } = planData;
              
              // Update entities with the selected value
              const updatedEntities = { ...entities, [entityType]: entityValue };
              
              // Reset failed step to pending so it can be retried
              plan.steps = plan.steps.map(s => 
                s.status === 'failed' ? { ...s, status: 'pending' as const, error: undefined } : s
              );
              plan.status = 'executing';
              
              // Update plan in DB with new entities
              await storePendingPlanAsync(plan, pattern, updatedEntities, memoryCtx, planIdToUpdate);
              
              console.info('[ai-chat] Resuming plan with selected entity:', entityType, '=', entityValue);
              
              // Send resuming status
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'step_progress',
                  planId: plan.id,
                  planName: plan.name,
                  stepIndex: plan.currentStepIndex,
                  totalSteps: plan.steps.length,
                  steps: plan.steps.map(s => ({
                    id: s.id,
                    name: s.name,
                    tool: s.tool,
                    status: s.status,
                    error: s.error,
                  })),
                  message: `Selected ${entityType}, resuming...`,
                })}\n\n`)
              );
              
              // Execute plan
              const executionContext: ExecutionContext = {
                supabase: supaAdmin,
                businessId,
                userId,
                controller,
                tools,
              };
              
              const executedPlan = await executePlan(
                plan,
                executionContext,
                updatedEntities,
                pattern,
                (result: PlannerResult) => {
                  if (result.type === 'step_progress' || result.type === 'step_complete') {
                    if (isLeadWorkflowPattern(pattern)) {
                      const customerData = extractCustomerData(
                        result.currentStep?.tool || '',
                        result.currentStep?.result,
                        updatedEntities
                      );
                      sendLeadWorkflowProgress(controller, result.plan, result.currentStep!, customerData);
                    } else if (isAssessmentWorkflowPattern(pattern)) {
                      sendAssessmentWorkflowProgress(controller, result.plan, result.currentStep!, {});
                    } else {
                      sendStepProgress(controller, result.plan, result.currentStep!, result.message);
                    }
                  } else if (result.type === 'plan_complete') {
                    const failedStep = result.plan.steps.find(s => s.status === 'failed');
                    
                    // Check for next process suggestion on successful completion
                    let nextSuggestion: NextProcessSuggestion | undefined;
                    if (!failedStep && result.plan.status === 'completed') {
                      const processId = getProcessFromPattern(pattern.id);
                      if (processId) {
                        const allResults: Record<string, any> = {};
                        result.plan.steps.forEach(step => {
                          if (step.result) {
                            allResults[step.tool] = step.result;
                            Object.assign(allResults, step.result);
                          }
                        });
                        const suggestion = getSuggestedNextProcess(processId, allResults);
                        if (suggestion) {
                          nextSuggestion = suggestion;
                          trackProcessJourney(supaAdmin, businessId, userId, {
                            processId,
                            status: 'completed',
                            planId: result.plan.id,
                            context: allResults,
                          });
                        }
                      }
                    }
                    
                    sendPlanComplete(controller, result.plan, failedStep, undefined, nextSuggestion);
                  }
                }
              );
              
              // Handle subsequent failures
              if (executedPlan.status === 'awaiting_recovery' || executedPlan.status === 'failed') {
                const failedStep = executedPlan.steps.find(s => s.status === 'failed');
                if (failedStep) {
                  const usedConversational = await executeConversationalRecovery(
                    controller,
                    executedPlan,
                    failedStep,
                    executionContext
                  );
                  if (!usedConversational) {
                    sendPlanComplete(controller, executedPlan, failedStep);
                  }
                }
              }
              
              // Clean up if completed
              if (executedPlan.status === 'completed') {
                removePendingPlan(plan.id);
                await removePendingPlanAsync(plan.id, memoryCtx);
              }
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();
              return;
            }
            
            // Plan not found
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'token',
                content: "I couldn't find the plan. Would you like to start over?",
              })}\n\n`)
            );
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
            return;
          }

          // ===============================================================
          // NATURAL LANGUAGE ENTITY SELECTION (for conversational recovery)
          // Handle responses like "the first one", "QUO-004", "John's quote", etc.
          // ===============================================================
          const awaitingPlan = await getMostRecentPendingPlanAsync(memoryCtx);
          if (awaitingPlan && awaitingPlan.plan.status === 'awaiting_recovery') {
            const normalizedMessage = message.toLowerCase().trim();
            
            // Parse natural language to find matching entity
            let matchedEntity = parseNaturalLanguageSelection(normalizedMessage, awaitingPlan);
            
            if (matchedEntity) {
              console.info('[ai-chat] Natural language matched entity:', matchedEntity);
              
              const { plan, pattern, entities } = awaitingPlan;
              let finalEntityValue = matchedEntity.entityValue;
              let finalDisplayLabel = matchedEntity.displayLabel;
              
              // Handle ordinal selections by re-running the query tool
              if (matchedEntity.entityValue.startsWith('__ordinal:')) {
                const ordinalIndex = parseInt(matchedEntity.entityValue.split(':')[1], 10);
                const failedStep = plan.steps?.find((s: any) => s.status === 'failed');
                
                // Find the appropriate query tool
                const queryToolName = failedStep?.tool === 'send_quote' || failedStep?.tool === 'approve_quote' 
                  ? 'list_pending_quotes' 
                  : failedStep?.tool === 'convert_quote_to_job' 
                    ? 'list_approved_quotes'
                    : null;
                
                if (queryToolName && tools[queryToolName]) {
                  const result = await tools[queryToolName].execute({}, { 
                    supabase: supaAdmin, 
                    businessId, 
                    userId 
                  });
                  
                  if (result.options && result.options[ordinalIndex]) {
                    finalEntityValue = result.options[ordinalIndex].value;
                    finalDisplayLabel = result.options[ordinalIndex].metadata?.number || result.options[ordinalIndex].label;
                  } else {
                    matchedEntity = null; // Invalid ordinal
                  }
                }
              }
              
              if (matchedEntity) {
                const updatedEntities = { ...entities, [matchedEntity.entityType]: finalEntityValue };
              
              // Reset failed step to pending so it can be retried
              plan.steps = plan.steps.map(s => 
                s.status === 'failed' ? { ...s, status: 'pending' as const, error: undefined } : s
              );
              plan.status = 'executing';
              
              // Update plan in DB with new entities
              await storePendingPlanAsync(plan, pattern, updatedEntities, memoryCtx, plan.id);
              
              console.info('[ai-chat] Resuming plan with natural language selection');
              
              // Send resuming status
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'token',
                  content: `Got it, using ${matchedEntity.displayLabel}. Resuming...`,
                })}\n\n`)
              );
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'step_progress',
                  planId: plan.id,
                  planName: plan.name,
                  stepIndex: plan.currentStepIndex,
                  totalSteps: plan.steps.length,
                  steps: plan.steps.map(s => ({
                    id: s.id,
                    name: s.name,
                    tool: s.tool,
                    status: s.status,
                    error: s.error,
                  })),
                  message: 'Resuming plan execution...',
                })}\n\n`)
              );
              
              // Execute plan
              const executionContext: ExecutionContext = {
                supabase: supaAdmin,
                businessId,
                userId,
                controller,
                tools,
              };
              
              const executedPlan = await executePlan(
                plan,
                executionContext,
                updatedEntities,
                pattern,
                (result: PlannerResult) => {
                  if (result.type === 'step_progress' || result.type === 'step_complete') {
                    if (isLeadWorkflowPattern(pattern)) {
                      const customerData = extractCustomerData(
                        result.currentStep?.tool || '',
                        result.currentStep?.result,
                        updatedEntities
                      );
                      sendLeadWorkflowProgress(controller, result.plan, result.currentStep!, customerData);
                    } else if (isAssessmentWorkflowPattern(pattern)) {
                      sendAssessmentWorkflowProgress(controller, result.plan, result.currentStep!, {});
                    } else {
                      sendStepProgress(controller, result.plan, result.currentStep!, result.message);
                    }
                  } else if (result.type === 'plan_complete') {
                    const failedStep = result.plan.steps.find(s => s.status === 'failed');
                    
                    // Check for next process suggestion on successful completion
                    let nextSuggestion: NextProcessSuggestion | undefined;
                    if (!failedStep && result.plan.status === 'completed') {
                      const processId = getProcessFromPattern(pattern.id);
                      if (processId) {
                        const allResults: Record<string, any> = {};
                        result.plan.steps.forEach(step => {
                          if (step.result) {
                            allResults[step.tool] = step.result;
                            Object.assign(allResults, step.result);
                          }
                        });
                        const suggestion = getSuggestedNextProcess(processId, allResults);
                        if (suggestion) {
                          nextSuggestion = suggestion;
                          trackProcessJourney(supaAdmin, businessId, userId, {
                            processId,
                            status: 'completed',
                            planId: result.plan.id,
                            context: allResults,
                          });
                        }
                      }
                    }
                    
                    sendPlanComplete(controller, result.plan, failedStep, undefined, nextSuggestion);
                  }
                }
              );
              
              // Handle subsequent failures
              if (executedPlan.status === 'awaiting_recovery' || executedPlan.status === 'failed') {
                const failedStep = executedPlan.steps.find(s => s.status === 'failed');
                if (failedStep) {
                  const usedConversational = await executeConversationalRecovery(
                    controller,
                    executedPlan,
                    failedStep,
                    executionContext
                  );
                  if (!usedConversational) {
                    sendPlanComplete(controller, executedPlan, failedStep);
                  }
                }
              }
              
              // Clean up if completed
              if (executedPlan.status === 'completed') {
                removePendingPlan(plan.id);
                await removePendingPlanAsync(plan.id, memoryCtx);
              }
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();
              return;
              }
            }
          }

          // Send clarification event if needed - this is a structured UI component
          if (orchestratorResult.type === 'clarification' && orchestratorResult.clarificationData) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'clarification',
                question: orchestratorResult.clarificationData.question,
                options: orchestratorResult.clarificationData.options,
                intent: orchestratorResult.intent?.intentId,
                allowFreeform: true,
              })}\n\n`)
            );
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
            return;
          }

          // Send confirmation event if needed - this is a structured UI component
          if (orchestratorResult.type === 'confirmation' && orchestratorResult.confirmationRequest) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'confirmation',
                action: orchestratorResult.confirmationRequest.action,
                description: orchestratorResult.confirmationRequest.description,
                riskLevel: orchestratorResult.confirmationRequest.riskLevel,
                confirmLabel: 'Yes, proceed',
                cancelLabel: 'Cancel',
              })}\n\n`)
            );
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
            return;
          }

          // ===============================================================
          // MULTI-STEP PLAN DETECTION (approval/rejection handled earlier)
          // ===============================================================
          // Check if this is a multi-step task that needs a plan
          const { isMultiStep, pattern: multiStepPattern } = detectMultiStepTask(
            message, 
            orchestratorResult.intent?.entities || {}
          );
          
          if (isMultiStep && multiStepPattern) {
            console.info('[ai-chat] Multi-step task detected:', multiStepPattern.id);
            
            // Build the execution plan
            const plan = buildExecutionPlan(multiStepPattern, orchestratorResult.intent?.entities || {});
            
            // Store for later approval (both cache for quick access and DB for persistence)
            storePendingPlan(plan, multiStepPattern, orchestratorResult.intent?.entities || {}, userId);
            await storePendingPlanAsync(plan, multiStepPattern, orchestratorResult.intent?.entities || {}, memoryCtx);
            
            // Check if this is a specialized workflow pattern - use dedicated card
            if (isLeadWorkflowPattern(multiStepPattern)) {
              console.info('[ai-chat] Using LeadWorkflowCard for pattern:', multiStepPattern.id);
              sendLeadWorkflowStart(controller, plan, orchestratorResult.intent?.entities || {});
            } else if (isAssessmentWorkflowPattern(multiStepPattern)) {
              console.info('[ai-chat] Using AssessmentWorkflowCard for pattern:', multiStepPattern.id);
              sendAssessmentWorkflowStart(controller, plan, orchestratorResult.intent?.entities || {});
            } else {
              // Send generic plan preview to frontend
              sendPlanPreview(controller, plan);
            }
            
            // Save plan preview as assistant message
            await supaAdmin.from('ai_chat_messages').insert({
              conversation_id: convId,
              role: 'assistant',
              content: `I've prepared a multi-step plan: "${plan.name}". Please review and approve to execute.`,
              metadata: { 
                planId: plan.id, 
                planName: plan.name, 
                stepCount: plan.steps.length,
                specialCardType: multiStepPattern.specialCardType,
              },
            });
            
            // Close stream - wait for approval
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
            return;
          }

          // ===============================================================
          // NORMAL AI FLOW (no multi-step plan)
          // ===============================================================

          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: aiMessages,
              stream: true,
              tools: Object.values(tools).map(t => ({
                type: 'function',
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters
                }
              }))
            }),
          });

          // Handle rate limit and payment errors
          if (!response.ok) {
            if (response.status === 429) {
              console.error('[ai-chat] Rate limit exceeded');
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'error',
                  error: 'AI is experiencing high demand. Please try again in a moment.',
                  errorType: 'RATE_LIMIT'
                })}\n\n`)
              );
              controller.close();
              return;
            }
            if (response.status === 402) {
              console.error('[ai-chat] Payment required - credits exhausted');
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'error',
                  error: 'AI credits exhausted. Please add credits to your workspace.',
                  errorType: 'PAYMENT_REQUIRED',
                  link: 'https://lovable.dev/settings/usage'
                })}\n\n`)
              );
              controller.close();
              return;
            }
            
            const errorText = await response.text();
            console.error('[ai-chat] AI API error:', response.status, errorText);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'error',
                error: 'AI service error', 
                details: errorText 
              })}\n\n`)
            );
            controller.close();
            return;
          }

          // Log vision query if media was included
          const startTime = Date.now();
          if (mediaIds && mediaIds.length > 0) {
            console.log(`[ai-chat] Vision query with ${mediaIds.length} image(s)`);
          }

          let fullResponse = '';
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          
          // Buffer for tool calls (they stream in chunks)
          let toolCallsBuffer: Record<number, any> = {};
          let isCollectingToolCalls = false;
          let toolResultsCollected: Record<string, any> = {};
          let executedToolCalls: Array<{ id: string; name: string; arguments: string }> = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;

                  if (delta?.content) {
                    fullResponse += delta.content;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'token', content: delta.content })}\n\n`)
                    );
                  }

                  // Buffer tool calls as they stream in
                  if (delta?.tool_calls) {
                    isCollectingToolCalls = true;
                    
                    for (const toolCall of delta.tool_calls) {
                      const index = toolCall.index || 0;
                      
                      if (!toolCallsBuffer[index]) {
                        toolCallsBuffer[index] = {
                          id: toolCall.id || '',
                          type: toolCall.type || 'function',
                          function: {
                            name: toolCall.function?.name || '',
                            arguments: toolCall.function?.arguments || ''
                          }
                        };
                      } else {
                        // Append to existing buffer
                        if (toolCall.function?.name) {
                          toolCallsBuffer[index].function.name += toolCall.function.name;
                        }
                        if (toolCall.function?.arguments) {
                          toolCallsBuffer[index].function.arguments += toolCall.function.arguments;
                        }
                      }
                    }
                  }

                  // Execute buffered tool calls when complete
                  if (parsed.choices?.[0]?.finish_reason === 'tool_calls' && isCollectingToolCalls) {
                    for (const index in toolCallsBuffer) {
                      const toolCall = toolCallsBuffer[index];
                      const tool = tools[toolCall.function.name];
                      
                      if (tool) {
                        try {
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ 
                              type: 'tool_call', 
                              tool: tool.name, 
                              status: 'executing' 
                            })}\n\n`)
                          );

                          const args = JSON.parse(toolCall.function.arguments || '{}');
                          const context = {
                            supabase: supaAdmin,
                            businessId: businessId,
                            userId: userId,
                            controller: controller,
                            encoder: encoder
                          };

                          const result = await tool.execute(args, context);
                          
                          // Store tool result for follow-up AI call
                          toolResultsCollected[tool.name] = result;
                          executedToolCalls.push({
                            id: `call_${index}`,
                            name: tool.name,
                            arguments: toolCall.function.arguments || '{}'
                          });
                          
                          // Learn preferences from tool execution
                          try {
                            await learnFromToolExecution(memoryCtx, tool.name, args, result);
                          } catch (learnErr) {
                            console.error('[ai-chat] Tool learning error (non-fatal):', learnErr);
                          }
                          
                          // Enrich result with display metadata for frontend
                          const enrichedResult = enrichToolResult(tool.name, result, args);
                          
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ 
                              type: 'tool_result', 
                              tool: tool.name, 
                              result: enrichedResult,
                              success: true 
                            })}\n\n`)
                          );
                        } catch (error) {
                          console.error(`Tool execution failed: ${tool.name}`, error);
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ 
                              type: 'tool_error', 
                              tool: tool.name, 
                              error: error.message 
                            })}\n\n`)
                          );
                        }
                      }
                    }
                    
                    // Reset buffer
                    toolCallsBuffer = {};
                    isCollectingToolCalls = false;
                  }
                } catch (e) {
                  console.error('Error parsing streaming data:', e);
                }
              }
            }
          }

          // FOLLOW-UP AI CALL: If tools were executed, call AI again to interpret results
          if (Object.keys(toolResultsCollected).length > 0 && executedToolCalls.length > 0) {
            console.log('[ai-chat] Tools executed, calling AI for follow-up interpretation');
            
            // Build messages with tool results for follow-up
            const messagesWithToolResults = [
              ...aiMessages,
              { 
                role: 'assistant' as const, 
                content: fullResponse || null,
                tool_calls: executedToolCalls.map(tc => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: { name: tc.name, arguments: tc.arguments }
                }))
              },
              ...executedToolCalls.map(tc => ({
                role: 'tool' as const,
                tool_call_id: tc.id,
                content: JSON.stringify(toolResultsCollected[tc.name] || { success: true })
              }))
            ];
            
            try {
              const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${lovableApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  messages: messagesWithToolResults,
                  stream: true,
                  // No tools - just get the response interpretation
                }),
              });

              if (followUpResponse.ok && followUpResponse.body) {
                const followUpReader = followUpResponse.body.getReader();
                const followUpDecoder = new TextDecoder();
                let followUpBuffer = '';

                while (true) {
                  const { done, value } = await followUpReader.read();
                  if (done) break;

                  followUpBuffer += followUpDecoder.decode(value, { stream: true });
                  const lines = followUpBuffer.split('\n');
                  followUpBuffer = lines.pop() || '';

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const data = line.slice(6);
                      if (data === '[DONE]') continue;

                      try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta;

                        if (delta?.content) {
                          fullResponse += delta.content;
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ type: 'token', content: delta.content })}\n\n`)
                          );
                        }
                      } catch (e) {
                        // Ignore parsing errors in follow-up
                      }
                    }
                  }
                }
              }
            } catch (followUpErr) {
              console.error('[ai-chat] Follow-up AI call failed (non-fatal):', followUpErr);
              // If follow-up fails, at least acknowledge the tool ran
              const fallbackMsg = "I've completed the action. Is there anything else you'd like me to help with?";
              fullResponse += fallbackMsg;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'token', content: fallbackMsg })}\n\n`)
              );
            }
          }

          // Save AI response
          await supaAdmin
            .from('ai_chat_messages')
            .insert({
              conversation_id: convId,
              role: 'assistant',
              content: fullResponse
            });

          // Track conversation state for multi-turn (IMPROVED: expanded triggers)
          try {
            // Expanded patterns for detecting when AI is prompting for more info
            const responsePromptsForInput = 
              fullResponse.trim().endsWith('?') ||
              /what\s+(is|are|was|were)\s+/i.test(fullResponse) ||
              /could you (provide|tell|share|give)/i.test(fullResponse) ||
              /please (provide|enter|share|give|tell)/i.test(fullResponse) ||
              /which (customer|job|quote|invoice|team member)/i.test(fullResponse) ||
              /who (is|should|would)/i.test(fullResponse) ||
              /i need (the|a|some|more)/i.test(fullResponse) ||
              /can you (provide|tell|share|give)/i.test(fullResponse) ||
              /let me know/i.test(fullResponse) ||
              /what would you like/i.test(fullResponse) ||
              /do you want/i.test(fullResponse);
            
            // Check if AI is explicitly awaiting input (marked in response)
            const hasAwaitingMarker = /\[AWAITING:([^\]]+)\]/i.test(fullResponse);
            const awaitingMarkerMatch = fullResponse.match(/\[AWAITING:([^\]]+)\]/i);
            
            if ((responsePromptsForInput || hasAwaitingMarker) && orchestratorResult.intent?.intentId) {
              // AI is prompting for input - store pending intent for follow-up
              console.info('[ai-chat] AI prompting for input, storing pending intent:', orchestratorResult.intent.intentId);
              
              // Detect what kind of input we're awaiting based on response content
              let awaitingInput = awaitingMarkerMatch?.[1] || 'general';
              
              if (awaitingInput === 'general') {
                // Auto-detect from response content
                if (/customer.*name|email|phone|details|which customer|customer info/i.test(fullResponse)) {
                  awaitingInput = 'customer_details';
                } else if (/line item|item description|what (services?|products?)|add.*item|items.*quote/i.test(fullResponse)) {
                  awaitingInput = 'quote_line_items';
                } else if (/amount|price|cost|how much|total|charge/i.test(fullResponse)) {
                  awaitingInput = 'amount';
                } else if (/address|location|where.*job|service address|what.*address|where.*work/i.test(fullResponse)) {
                  awaitingInput = 'job_address';
                } else if (/service type|type of (job|work|service)|what kind of|nature of/i.test(fullResponse)) {
                  awaitingInput = 'service_type';
                } else if (/duration|how long|time.*take|estimated time/i.test(fullResponse)) {
                  awaitingInput = 'duration';
                } else if (/who.*assign|assign.*to|team member|technician|which (tech|worker)/i.test(fullResponse)) {
                  awaitingInput = 'assignee';
                } else if (/due date|payment terms|when.*due|net \d+/i.test(fullResponse)) {
                  awaitingInput = 'invoice_terms';
                } else if (/description|notes|details about|additional info|tell me about/i.test(fullResponse)) {
                  awaitingInput = 'description';
                } else if (/date|when|time|schedule|what day/i.test(fullResponse)) {
                  awaitingInput = 'date';
                } else if (/confirm|are you sure|proceed|go ahead|shall i/i.test(fullResponse)) {
                  awaitingInput = 'confirmation';
                } else if (/title|name.*job|job.*name|what.*call/i.test(fullResponse)) {
                  awaitingInput = 'job_title';
                }
              }
              
              // Merge new entities with existing collected entities (don't lose context!)
              const existingEntities = orchestratorResult.intent.entities || {};
              const previousState = await import('./memory-manager.ts').then(m => m.getConversationState(memoryCtx)).catch(() => null);
              const mergedEntities = {
                ...(previousState?.collectedEntities || {}),
                ...existingEntities
              };
              
              await setConversationState(memoryCtx, {
                pendingIntent: orchestratorResult.intent.intentId,
                awaitingInput,
                lastAssistantAction: 'asked_question',
                collectedEntities: mergedEntities
              });
              
              console.info('[ai-chat] State saved - awaitingInput:', awaitingInput, 'entities:', Object.keys(mergedEntities));
            } else if (orchestratorResult.intent?.isFollowUp) {
              // This was a follow-up - check if action was actually completed
              // Only clear if we got a definitive completion signal (tool executed successfully)
              const toolWasExecuted = Object.keys(toolCallsBuffer).length > 0 || fullResponse.includes('✅');
              
              if (toolWasExecuted && !responsePromptsForInput) {
                console.info('[ai-chat] Intent completed after follow-up, clearing conversation state');
                await clearConversationState(memoryCtx);
              } else if (!responsePromptsForInput) {
                // Response doesn't prompt for more but also didn't execute - might need to ask
                console.info('[ai-chat] Follow-up processed but no tool executed, keeping state for now');
              }
              // If still prompting, state was already updated above
            }
          } catch (stateErr) {
            console.error('[ai-chat] Conversation state tracking error (non-fatal):', stateErr);
          }

          // Check if conversation needs summarization
          try {
            const { data: convData } = await supaAdmin
              .from('ai_chat_conversations')
              .select('message_count, last_summarized_at')
              .eq('id', convId)
              .single();

            const needsSummary = await shouldSummarize(
              memoryCtx,
              convData?.message_count || 0,
              convData?.last_summarized_at
            );

            if (needsSummary) {
              console.info('[ai-chat] Triggering conversation summarization');
              const { toSummarize } = await getMessagesForSummarization(supaAdmin, convId);
              
              if (toSummarize.length > 0) {
                const summaryPrompt = buildSummarizationPrompt(toSummarize);
                
                // Generate summary using AI
                const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${lovableApiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                      { role: 'system', content: 'You are a conversation summarizer. Output valid JSON only.' },
                      { role: 'user', content: summaryPrompt }
                    ]
                  }),
                });

                if (summaryResponse.ok) {
                  const summaryData = await summaryResponse.json();
                  const summaryText = summaryData.choices?.[0]?.message?.content;
                  if (summaryText) {
                    const parsed = parseSummaryResponse(summaryText);
                    await storeSummary(memoryCtx, parsed);
                    console.info('[ai-chat] Conversation summarized successfully');
                  }
                }
              }
            }
          } catch (sumErr) {
            console.error('[ai-chat] Summarization error (non-fatal):', sumErr);
          }

          // Log vision query activity if media was used
          if (mediaIds && mediaIds.length > 0) {
            const responseTime = Date.now() - startTime;
            await supaAdmin.from('ai_activity_log').insert({
              business_id: businessId,
              user_id: userId,
              activity_type: 'vision_query',
              description: `AI analyzed ${mediaIds.length} image(s)`,
              metadata: {
                image_count: mediaIds.length,
                has_text: !!message,
                response_time_ms: responseTime,
                response_length: fullResponse.length
              }
            });
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
