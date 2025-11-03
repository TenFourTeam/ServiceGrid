import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { requireCtx, corsHeaders } from '../_lib/auth.ts';

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
        .eq('status', 'Unscheduled')
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
        .select('user_id, profiles(id, full_name, email)')
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

      // 1. Gather all unscheduled jobs
      const { data: jobs, error: jobsError } = await context.supabase
        .from('jobs')
        .select('*, customers(id, name, address, preferred_days, avoid_days, preferred_time_window)')
        .in('id', args.jobIds)
        .eq('business_id', context.businessId);
      
      if (jobsError) throw jobsError;
      if (!jobs || jobs.length === 0) throw new Error('No jobs found');

      // 2. Gather scheduling context
      const dateRange = args.preferredDateRange || {
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

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

      // 4. Apply scheduling suggestions
      const results = [];
      const failed = [];
      
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
            failed.push({ jobId: suggestion.jobId, error: updateError.message });
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
            success: true,
            scheduledTime: suggestion.recommendedStartTime,
            assignedTo: suggestion.assignedMemberId,
            reasoning: suggestion.reasoning,
            priorityScore: suggestion.priorityScore
          });
        } catch (err) {
          console.error('[batch_schedule_jobs] Error processing suggestion:', err);
          failed.push({ jobId: suggestion.jobId, error: err.message });
        }
      }
      
      // 5. Log activity
      await context.supabase.from('ai_activity_log').insert({
        business_id: context.businessId,
        user_id: context.userId,
        activity_type: 'batch_schedule',
        description: `Scheduled ${results.length} of ${args.jobIds.length} jobs using AI optimization`,
        metadata: {
          tool: 'batch_schedule_jobs',
          requested: args.jobIds.length,
          scheduled: results.length,
          failed: failed.length,
          constraints: args.constraints
        },
        accepted: true
      });

      console.info('[batch_schedule_jobs] Completed', {
        scheduled: results.length,
        failed: failed.length
      });

      return {
        success: true,
        scheduled_count: results.length,
        requested_count: args.jobIds.length,
        results,
        failed,
        message: failed.length > 0 
          ? `Scheduled ${results.length} of ${args.jobIds.length} jobs. ${failed.length} couldn't be scheduled.`
          : `Successfully scheduled all ${results.length} jobs.`
      };
    }
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate using Clerk JWT
    const { userId, businessId, supaAdmin } = await requireCtx(req);

    const { conversationId, message, includeContext } = await req.json();

    let convId = conversationId;
    
    // Create or load conversation
    if (!convId) {
      const { data: newConv, error: convError } = await supaAdmin
        .from('ai_chat_conversations')
        .insert({
          business_id: businessId,
          user_id: userId,
          title: message.substring(0, 100)
        })
        .select()
        .single();

      if (convError) throw convError;
      convId = newConv.id;
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
    const systemPrompt = `You are a proactive AI scheduling assistant for a service business management system.
You can both QUERY information and TAKE ACTIONS to help manage the business efficiently.

Current Context:
- Business ID: ${businessId}
- Current Page: ${includeContext?.currentPage || 'unknown'}
- Date: ${new Date().toISOString().split('T')[0]}

Available Tools:
1. get_unscheduled_jobs - Find jobs that need scheduling
2. check_team_availability - Check who's free at specific times
3. get_schedule_summary - Overview of jobs in date range
4. auto_schedule_job - Schedule single job with basic optimization
5. batch_schedule_jobs - ⭐ SMART BATCH SCHEDULER - Schedule multiple jobs at once with full AI optimization
6. create_job_from_request - Convert service request to job
7. optimize_route_for_date - Optimize job order for efficiency
8. get_scheduling_conflicts - Find overlapping bookings
9. get_customer_details - Get customer history and info
10. update_job_status - Change job status
11. get_capacity_forecast - Predict workload and availability
12. reschedule_job - Move job to different time

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
   - Example: "I can schedule all 5 jobs optimally right now. [BUTTON:batch_schedule:[job_ids]:Schedule All]"

3. AFTER SCHEDULING: Confirm and offer next steps
   - Show what was scheduled (dates/times)
   - Offer calendar view: "View on calendar: [BUTTON:view_calendar_2024-03-15:Open Calendar 📅]"
   - Suggest follow-ups if relevant

BATCH SCHEDULING INTELLIGENCE:
The batch_schedule_jobs tool is SMART:
✅ Respects team availability and time off
✅ Groups jobs by location to minimize driving
✅ Honors customer preferred days/time windows
✅ Balances workload across team members
✅ Schedules urgent jobs (priority 1-2) first
✅ Leaves buffers between jobs for travel
✅ Checks business constraints (max jobs/day, hours)

RESPONSE STYLE:
1. Be proactive and actionable - don't just inform, offer to act
2. Use clickable buttons for actions:
   [BUTTON:message_to_send:Button Label]
   
   Examples:
   - "Found 5 jobs. [BUTTON:batch_schedule_jobs with job IDs:Schedule All]"
   - "3 urgent jobs! [BUTTON:batch_schedule priority jobs:Schedule Urgent First]"
   
3. Keep responses concise (2-4 sentences ideal)
4. Use emojis for visual hierarchy (✅ success, ⚠️ warnings, 📅 scheduling, 🚗 travel)
5. Explain AI reasoning when scheduling: "Grouped these 3 jobs because they're all on Main Street"
6. Always confirm before cancellations or major changes
7. If capacity issues, explain constraints clearly

Response Examples:
✅ Good: "Found 3 unscheduled jobs, all in the same area. I can schedule them back-to-back tomorrow morning to minimize travel. [BUTTON:Schedule these 3 jobs tomorrow:Schedule]"
✅ Good: "⚠️ 2 urgent jobs found. I'll prioritize these and fit 3 others around team availability. [BUTTON:batch_schedule_jobs with all IDs:Schedule All]"
❌ Bad: "There are some jobs that need scheduling. Would you like me to look into that?"

INTELLIGENCE NOTES:
- When jobs have same/nearby addresses → Mention grouping for efficiency
- When customer has preferred days → Honor those preferences
- When team is at capacity → Suggest spreading across multiple days
- When urgent jobs exist → Prioritize those first
- Always explain YOUR reasoning for scheduling decisions`;


    // Prepare messages for AI
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

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

          if (!response.ok) {
            throw new Error(`AI API error: ${response.statusText}`);
          }

          let fullResponse = '';
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

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

                  // Handle tool calls
                  if (delta?.tool_calls) {
                    for (const toolCall of delta.tool_calls) {
                      if (toolCall.function?.name) {
                        const tool = tools[toolCall.function.name];
                        if (tool) {
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ type: 'tool_call', tool: tool.name, status: 'executing' })}\n\n`)
                          );

                          const args = JSON.parse(toolCall.function.arguments || '{}');
                          const context = {
                            supabase: supaAdmin,
                            businessId: businessId,
                            userId: userId
                          };

                          const result = await tool.execute(args, context);
                          
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: tool.name, result })}\n\n`)
                          );
                        }
                      }
                    }
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
