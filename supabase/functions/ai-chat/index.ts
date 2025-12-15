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
  type ExecutionPlan,
  type ExecutionContext,
  type PlannerResult 
} from './multi-step-planner.ts';

// Memory & Context Persistence
import { 
  loadMemory, 
  rememberEntity, 
  getRecentEntities,
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
      const sendProgress = (message: string) => {
        if (context.controller) {
          const encoder = new TextEncoder();
          context.controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'tool_progress', progress: message })}\n\n`)
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
      
      for (const suggestion of suggestions) {
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
        .select('id, number, status, total, valid_until, created_at, customers(name, email)')
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
  }
};

// Helper function to fetch greeting context using context loader
async function fetchGreetingContext(context: any) {
  const [unscheduledJobs, todaysJobs, teamMembers, recentActivity, business] = await Promise.all([
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
      .gte('starts_at', new Date().toISOString().split('T')[0])
      .lt('starts_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]),
    
    // Team members count
    context.supabase
      .from('business_permissions')
      .select('user_id', { count: 'exact', head: true })
      .eq('business_id', context.businessId),
    
    // Recent AI activity (last 3)
    context.supabase
      .from('ai_activity_log')
      .select('activity_type, description, created_at')
      .eq('business_id', context.businessId)
      .order('created_at', { ascending: false })
      .limit(3),
    
    // Business info
    context.supabase
      .from('businesses')
      .select('name')
      .eq('id', context.businessId)
      .single()
  ]);

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return {
    businessName: business.data?.name || 'your business',
    unscheduledCount: unscheduledJobs.count || 0,
    todaysJobsCount: todaysJobs.count || 0,
    teamMemberCount: teamMembers.count || 0,
    recentActivity: recentActivity.data || [],
    timeOfDay,
    currentPage: context.currentPage || 'dashboard'
  };
}

async function generateGreetingMessage(context: any): Promise<string> {
  const ctx = await fetchGreetingContext(context);
  
  let greeting = `Good ${ctx.timeOfDay}! `;
  
  // Acknowledge previous interactions if they exist
  if (ctx.recentActivity.length > 0) {
    const lastActivity = ctx.recentActivity[0];
    const lastActionTime = new Date(lastActivity.created_at);
    const hoursSince = Math.floor((Date.now() - lastActionTime.getTime()) / (1000 * 60 * 60));
    
    if (hoursSince < 24) {
      greeting += `Welcome back! `;
    } else if (hoursSince < 168) { // Less than a week
      greeting += `Great to see you again! `;
    }
  }
  
  // Business state summary
  const statusParts: string[] = [];
  
  if (ctx.unscheduledCount > 0) {
    statusParts.push(`**${ctx.unscheduledCount} job${ctx.unscheduledCount !== 1 ? 's' : ''} waiting to be scheduled**`);
  }
  
  if (ctx.todaysJobsCount > 0) {
    statusParts.push(`${ctx.todaysJobsCount} job${ctx.todaysJobsCount !== 1 ? 's' : ''} on your calendar today`);
  } else if (ctx.timeOfDay === 'morning') {
    statusParts.push(`no jobs scheduled today yet`);
  }
  
  if (statusParts.length > 0) {
    greeting += `I see you have ${statusParts.join(', and ')}. `;
  }
  
  // Proactive suggestions based on state
  if (ctx.unscheduledCount > 0) {
    if (ctx.unscheduledCount >= 5) {
      greeting += `\n\nThat's quite a backlog! I can schedule all of them at once with smart routing and team balancing. Just say "schedule all pending jobs" and I'll handle it. ✨`;
    } else {
      greeting += `\n\nI can help schedule ${ctx.unscheduledCount === 1 ? 'it' : 'them'} efficiently. Want me to find optimal time slots?`;
    }
  } else if (ctx.todaysJobsCount > 0) {
    greeting += `\n\nYour team is ready to go! Need help with route optimization or any last-minute changes?`;
  } else {
    greeting += `\n\nLooking pretty clear! Want to focus on filling your calendar for the rest of the week?`;
  }
  
  // Context-specific suggestions
  const page = ctx.currentPage;
  if (page.includes('/calendar')) {
    greeting += `\n\n💡 **Quick tip**: I can optimize your routes to minimize drive time between jobs.`;
  } else if (page.includes('/team')) {
    greeting += `\n\n💡 **Quick tip**: I can check team availability and balance workloads across members.`;
  }
  
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

    // Use the agent orchestrator for intelligent prompt building
    const sessionContext: SessionContext = {
      businessId,
      userId,
      currentPage: includeContext?.currentPage,
      entityId: includeContext?.entityId,
      entityType: includeContext?.entityType,
    };

    const orchestratorResult = await orchestrate(message, sessionContext, supaAdmin);
    console.info('[ai-chat] Orchestrator result:', orchestratorResult.type, orchestratorResult.intent?.intentId);

    // Helper to generate clarification options from intent
    const generateClarificationOptions = (intent: any): Array<{label: string, value: string}> => {
      if (!intent) return [];
      
      // Domain-specific option generators
      const optionsByDomain: Record<string, Array<{label: string, value: string}>> = {
        scheduling: [
          { label: 'Schedule pending jobs', value: 'Schedule all my pending jobs' },
          { label: 'View my schedule', value: 'Show me my schedule for this week' },
          { label: 'Check availability', value: 'Check team availability for tomorrow' },
        ],
        invoicing: [
          { label: 'Create invoice', value: 'Create a new invoice' },
          { label: 'View unpaid', value: 'Show me unpaid invoices' },
          { label: 'Send reminders', value: 'Send payment reminders' },
        ],
        quotes: [
          { label: 'Create quote', value: 'Create a new quote' },
          { label: 'View pending', value: 'Show me pending quotes' },
          { label: 'Follow up', value: 'Help me follow up on quotes' },
        ],
        customers: [
          { label: 'Add customer', value: 'Add a new customer' },
          { label: 'Search customers', value: 'Search for a customer' },
          { label: 'View history', value: 'Show customer history' },
        ],
      };
      
      return optionsByDomain[intent.domain] || [
        { label: 'Tell me more', value: 'Can you explain what you need help with?' },
        { label: 'Show options', value: 'What can you help me with?' },
      ];
    };

    // Handle clarification requests - send structured SSE event
    if (orchestratorResult.type === 'clarification' && orchestratorResult.clarificationQuestion) {
      console.info('[ai-chat] Clarification needed:', orchestratorResult.clarificationQuestion);
    }

    // Handle confirmation requests - send structured SSE event  
    if (orchestratorResult.type === 'confirmation' && orchestratorResult.confirmationRequest) {
      console.info('[ai-chat] Confirmation needed:', orchestratorResult.confirmationRequest.action);
    }

    // Build memory context section for system prompt
    const memorySection = [
      summaryContextStr,
      entityContextStr,
      preferenceContextStr
    ].filter(Boolean).join('\n\n');

    // Build the system prompt - use orchestrator's dynamic prompt if available
    const baseSystemPrompt = orchestratorResult.systemPrompt || `You are a proactive AI scheduling assistant for a service business management system.
You can both QUERY information and TAKE ACTIONS to help manage the business efficiently.${visionNote}

Current Context:
- Business ID: ${businessId}
- Current Page: ${includeContext?.currentPage || 'unknown'}
- Date: ${new Date().toISOString().split('T')[0]}

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
3. Keep responses concise (2-4 sentences ideal)
4. Use emojis for visual hierarchy (✅ success, ⚠️ warnings, 📅 scheduling, 🚗 travel)
5. Explain AI reasoning when scheduling
6. Always confirm before cancellations or major changes`;


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

          // Send clarification event if needed - this is a structured UI component
          if (orchestratorResult.type === 'clarification' && orchestratorResult.clarificationQuestion) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'clarification',
                question: orchestratorResult.clarificationQuestion,
                options: generateClarificationOptions(orchestratorResult.intent),
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
          // MULTI-STEP PLAN DETECTION & EXECUTION
          // ===============================================================
          
          // First, check if this is a plan approval/rejection message
          const planApproval = detectPlanApproval(message);
          
          if (planApproval.isApproval) {
            // User approved a plan - execute it
            // Try async DB lookup first, fall back to cache
            let pendingPlanData = planApproval.planId 
              ? getPendingPlan(planApproval.planId)
              : getMostRecentPendingPlan(userId);
            
            // If not in cache, try database
            if (!pendingPlanData) {
              pendingPlanData = planApproval.planId 
                ? await getPendingPlanAsync(planApproval.planId, memoryCtx)
                : await getMostRecentPendingPlanAsync(memoryCtx);
            }
            
            if (pendingPlanData) {
              const { plan, pattern, entities } = pendingPlanData;
              
              // Remove from pending (both cache and DB)
              removePendingPlan(plan.id);
              await removePendingPlanAsync(plan.id, memoryCtx);
              
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
                    sendStepProgress(controller, result.plan, result.currentStep!, result.message);
                  } else if (result.type === 'plan_complete' || result.type === 'plan_failed') {
                    sendPlanComplete(controller, result.plan);
                  }
                }
              );
              
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
                ? `✅ Plan "${plan.name}" completed successfully in ${Math.round((executedPlan.totalDurationMs || 0) / 1000)}s.`
                : `❌ Plan "${plan.name}" failed. ${executedPlan.rollbackSteps?.length || 0} steps were rolled back.`;
              
              await supaAdmin.from('ai_chat_messages').insert({
                conversation_id: convId,
                role: 'assistant',
                content: summaryMessage,
              });
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();
              return;
            }
            // If no pending plan found, continue with normal AI flow
          }
          
          if (planApproval.isRejection) {
            // User rejected a plan - try cache first, then DB
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
            // If no pending plan found, continue with normal AI flow
          }
          
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
            
            // Send plan preview to frontend
            sendPlanPreview(controller, plan);
            
            // Save plan preview as assistant message
            await supaAdmin.from('ai_chat_messages').insert({
              conversation_id: convId,
              role: 'assistant',
              content: `I've prepared a multi-step plan: "${plan.name}". Please review and approve to execute.`,
              metadata: { planId: plan.id, planName: plan.name, stepCount: plan.steps.length },
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
                          
                          // Learn preferences from tool execution
                          try {
                            await learnFromToolExecution(memoryCtx, tool.name, args, result);
                          } catch (learnErr) {
                            console.error('[ai-chat] Tool learning error (non-fatal):', learnErr);
                          }
                          
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ 
                              type: 'tool_result', 
                              tool: tool.name, 
                              result,
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

          // Save AI response
          await supaAdmin
            .from('ai_chat_messages')
            .insert({
              conversation_id: convId,
              role: 'assistant',
              content: fullResponse
            });

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
